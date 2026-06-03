import NodeCache from "node-cache";
import { getProviders, getProvider } from "../providers.js";
import { StreamDTO } from "../stream.contract.js";
import { ProviderError, PROVIDER_ERROR } from "../error.provider.js";

export class StreamEngine {
  constructor(options = {}) {
    this.attempts = options.attempts ?? 2;
    this.MAX_TTL = options.maxTTL ?? 300;

    this.cache = new NodeCache({
      checkperiod: 30,
      useClones: false,
    });

    this.pending = new Map();
  }

  // -------------------------
  // CACHE KEY
  // -------------------------
  _key(providerKey, channelKey) {
    return `stream:${providerKey || "any"}:${String(channelKey)
      .toLowerCase()
      .trim()}`;
  }

  // -------------------------
  // MAIN ENTRY
  // -------------------------
  async resolve(providerKey, channelKey) {
    const cacheKey = this._key(providerKey, channelKey);

    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    if (this.pending.has(cacheKey)) {
      return this.pending.get(cacheKey);
    }

    const promise = this._resolveInternal(providerKey, channelKey, cacheKey);

    this.pending.set(cacheKey, promise);

    try {
      return await promise;
    } finally {
      this.pending.delete(cacheKey);
    }
  }

  // -------------------------
  // INTERNAL RESOLVE LOGIC
  // -------------------------
  async _resolveInternal(providerKey, channelKey, cacheKey) {
    const providers = getProviders();
    const provider = providerKey ? getProvider(providerKey) : null;

    // invalid provider early exit
    if (providerKey && !provider) {
      throw this._buildError(
        new ProviderError(
          PROVIDER_ERROR.PROVIDER_NOT_FOUND,
          `Provider not found: ${providerKey}`,
        ),
        providers,
        providerKey,
      );
    }

    const selectedProviders = provider ? [provider] : providers;
    const errors = [];

    for (const p of selectedProviders) {
      try {
        const raw = await this._executeWithRetry(p, channelKey);

        const dto = this._normalize(p, raw);

        const ttl = this._computeTTL(dto);
        if (ttl > 0) {
          this.cache.set(cacheKey, dto, ttl);
        }

        return dto;
      } catch (err) {
        errors.push(err);
      }
    }

    throw this._buildError(
      errors[0] ||
        new ProviderError(
          PROVIDER_ERROR.UPSTREAM_FAILED,
          "All providers failed",
        ),
      providers,
      providerKey,
      channelKey,
    );
  }

  // -------------------------
  // RETRY LOGIC
  // -------------------------
  async _executeWithRetry(provider, channelKey) {
    let lastError;

    for (let i = 0; i < this.attempts; i++) {
      try {
        return await provider.fetch(channelKey);
      } catch (err) {
        lastError = err;

        // no retry for invalid channel
        if (err.code === PROVIDER_ERROR.CHANNEL_NOT_FOUND) {
          throw err;
        }
      }
    }

    throw lastError;
  }

  // -------------------------
  // NORMALIZATION
  // -------------------------
  _normalize(provider, raw) {
    return new StreamDTO({
      ...raw,
      metadata: {
        ...raw.metadata,
        provider: provider.displayName,
      },
    });
  }

  // -------------------------
  // TTL CALCULATION
  // -------------------------
  _computeTTL(stream) {
    if (!stream.expiresAt) return 60;

    const diff = stream.expiresAt.getTime() - Date.now();

    return Math.min(Math.max(Math.floor(diff / 1000), 0), this.MAX_TTL);
  }

  // -------------------------
  // ERROR ENRICHMENT
  // -------------------------
  _buildError(err, providers, providerKey, channelKey) {
    if (!(err instanceof ProviderError)) return err;

    const meta = { ...(err.meta || {}) };

    // unknown provider → list all providers
    if (err.code === PROVIDER_ERROR.PROVIDER_NOT_FOUND) {
      meta.availableProviders = providers.map((p) => p.key);
    }

    // wrong channel → list channels for provider or fallback
    if (err.code === PROVIDER_ERROR.CHANNEL_NOT_FOUND) {
      const provider = providerKey
        ? providers.find(
            (p) => p.key.toLowerCase() === providerKey.toLowerCase(),
          )
        : null;

      meta.availableChannels = provider
        ? provider.getAvailableChannels()
        : providers.map((p) => p.key);
    }

    return new ProviderError(err.code, err.message, meta, err.cause);
  }
}
