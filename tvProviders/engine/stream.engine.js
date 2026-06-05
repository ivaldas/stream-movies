import NodeCache from "node-cache";
import { getProviders, getProvider } from "../registry/providers.js";
import { StreamDTO } from "../dto/stream.contract.js";
import { ProviderError, PROVIDER_ERROR } from "../errors/error.provider.js";
import { validateStream } from "../tvProvider utils/streamValidator.util.js";

export class StreamEngine {
  constructor(options = {}) {
    this.attempts = options.attempts ?? 2;
    this.MAX_TTL = options.maxTTL ?? 300;

    this.cache = new NodeCache({
      checkperiod: 30,
      useClones: false,
    });

    this.healthCache = new NodeCache({
      stdTTL: 60, // cache health for 60s
      checkperiod: 30,
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

  async _getStreamHealth(url) {
    const cached = this.healthCache.get(url);
    if (cached !== undefined) return cached;

    const result = await validateStream(url).catch(() => ({
      ok: false,
      reason: "exception",
    }));

    this.healthCache.set(url, result);
    return result;
  }

  // -------------------------
  // MAIN ENTRY
  // -------------------------
  async resolve(providerKey, channelKey) {
    const cacheKey = this._key(providerKey, channelKey);

    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) return cached;

    if (this.pending.has(cacheKey)) return this.pending.get(cacheKey);

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
    if (!providers.length) {
      throw new ProviderError(
        PROVIDER_ERROR.PROVIDER_NOT_FOUND,
        "No providers registered",
      );
    }

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
        if (!raw || typeof raw !== "object") {
          throw new ProviderError(
            PROVIDER_ERROR.INVALID_RESPONSE,
            "Provider returned invalid payload",
          );
        }

        const dto = this._normalize(p, raw);

        const healthResult = await this._getStreamHealth(dto.streamUrl);

        const isStreamable = healthResult.ok;

        const result = {
          stream: new StreamDTO({
            ...dto,
            isStreamable, // OVERRIDE provider value
          }),
          health: healthResult.ok ? "ok" : "bad",
          healthReason: healthResult.reason,
          canPlay: isStreamable,
        };

        const ttl = this._computeTTL(dto);

        if (ttl > 0) {
          this.cache.set(
            cacheKey,
            result,
            healthResult.ok ? ttl : Math.min(ttl, 30),
          );
        }

        return result;
      } catch (err) {
        errors.push(
          err instanceof ProviderError
            ? err
            : new ProviderError(
                PROVIDER_ERROR.UPSTREAM_FAILED,
                "Unexpected error",
                {},
                err,
              ),
        );
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
        if (
          err instanceof ProviderError &&
          err.code === PROVIDER_ERROR.CHANNEL_NOT_FOUND
        ) {
          throw err;
        }
        if (i < this.attempts - 1)
          await new Promise((r) => setTimeout(r, 200 * (i + 1)));
      }
    }

    throw lastError;
  }

  // -------------------------
  // NORMALIZATION
  // -------------------------
  _normalize(provider, raw) {
    if (raw instanceof StreamDTO) {
      return new StreamDTO({
        ...raw,
        metadata: {
          ...raw.metadata,
          provider: provider.displayName,
        },
      });
    }

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
    if (diff <= 0) return 0;

    return Math.min(Math.floor(diff / 1000), this.MAX_TTL);
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
