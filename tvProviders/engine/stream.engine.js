import NodeCache from "node-cache";

import { getProviders, getProvider } from "../registry/providers.js";
import { StreamDTO } from "../dto/stream.contract.js";
import { ProviderError, PROVIDER_ERROR } from "../errors/error.provider.js";
import { validateStream } from "../tvProvider utils/streamValidator.util.js";
import { getFFmpegHealth } from "../tvProvider utils/ffmpeg.health.util.js";

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
    this.ffmpegCache = new NodeCache({
      stdTTL: 600, // 10 min (FFmpeg results are expensive)
      useClones: false,
    });

    this.pending = new Map();
    this.pendingHealth = new Map();
  }

  // CACHE KEY
  _key(providerKey, channelKey) {
    return `stream:${providerKey || "any"}:${String(channelKey)
      .toLowerCase()
      .trim()}`;
  }

  // FETCH PLAYLIST RECURSIVELY
  async _fetchPlaylistRecursive(url, depth = 0, timeoutMs = 10000) {
    if (depth > 2) return "";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { signal: controller.signal });
      const text = await res.text();

      if (text.includes("#EXT-X-STREAM-INF")) {
        const lines = text.split("\n");
        const variantUrls = lines
          .filter((l) => l && !l.startsWith("#"))
          .map((l) => new URL(l, url).href);

        let combined = text;
        for (const v of variantUrls) {
          combined +=
            "\n" +
            (await this._fetchPlaylistRecursive(v, depth + 1, timeoutMs));
        }
        return combined;
      }

      return text;
    } catch (err) {
      if (err.name === "AbortError") {
        throw Object.assign(new Error("playlist_fetch_timeout"), {
          reason: "playlist_fetch_timeout",
          url,
        });
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  // -------------------------
  // STREAM HEALTH
  // -------------------------
  async _getStreamHealth(url) {
    const cached = this.healthCache.get(url);
    if (cached) {
      // console.log("Stream health cache hit:", url);
      return cached;
    }

    let promise = this.pendingHealth.get(url);
    if (!promise) {
      promise = (async () => {
        const result = {
          ok: false,
          stage: "validate",
          reason: "unknown",
          diagnostics: {
            ffmpegOk: false,
            isDrmProtected: false,
            raw: null,
          },
        };

        try {
          // ----- 1. NETWORK VALIDATION -----
          const validate = await validateStream(url);
          if (!validate.ok) {
            result.reason = validate.reason;
            this.healthCache.set(url, result);
            return result;
          }

          // ----- 2. PLAYLIST ANALYSIS -----
          let playlistText = "";
          try {
            playlistText = await this._fetchPlaylistRecursive(url);
          } catch (err) {
            const reason =
              err?.reason === "playlist_fetch_timeout"
                ? "playlist_fetch_timeout"
                : "playlist_fetch_failed";

            result.reason = reason;
            result.ok = false;
            result.stage =
              err?.reason === "playlist_fetch_timeout"
                ? "network_timeout"
                : "network_error";

            this.healthCache.set(url, result);
            return result; // early exit on network/playlist failure
          }

          // ----- 3. DRM CHECK -----
          const hasSkd = /skd:\/\//.test(playlistText);
          const hasWidevine = playlistText.toLowerCase().includes("widevine");
          const hasFairplayKey =
            /KEYFORMAT="com.apple.streamingkeydelivery"/.test(playlistText);
          const isDrmProtected = hasSkd || hasFairplayKey || hasWidevine;

          // ----- 4. FFMPEG CHECK with caching -----
          let ffmpegOk = false;
          let ffmpegRaw = null;

          const cachedFfmpeg = this.ffmpegCache.get(url);

          if (cachedFfmpeg) {
            ffmpegOk = cachedFfmpeg.ok;
            ffmpegRaw = cachedFfmpeg.raw;
          } else {
            try {
              const ffmpeg = await getFFmpegHealth(this, url);
              ffmpegRaw = ffmpeg.raw ?? null;

              const rawLower = ffmpegRaw?.toLowerCase() ?? "";
              const ffmpegBlocked =
                ffmpegRaw &&
                (rawLower.includes("skd") ||
                  rawLower.includes("drm") ||
                  rawLower.includes("decryption") ||
                  rawLower.includes("unauthorized"));

              ffmpegOk = ffmpeg.ok && !ffmpegBlocked;

              // cache FFmpeg result for 10 min
              this.ffmpegCache.set(
                url,
                { ok: ffmpegOk, raw: ffmpegRaw },
                ffmpegOk ? 600 : 60,
              );
            } catch (err) {
              ffmpegOk = false;
              ffmpegRaw = err?.raw ?? null;
              this.ffmpegCache.set(url, { ok: false, raw: ffmpegRaw }, 60);
            }
          }

          // ----- 5. FINAL DECISION -----
          const ok = ffmpegOk && !isDrmProtected;

          result.ok = ok;

          if (!playlistText) {
            result.stage =
              result.reason === "playlist_fetch_timeout"
                ? "network_timeout"
                : "network_error";
          } else if (isDrmProtected) {
            result.stage = "drm";
          } else {
            result.stage = "ffmpeg";
          }

          result.reason = isDrmProtected
            ? hasSkd
              ? "drm_skd_not_supported"
              : hasWidevine
                ? "drm_widevine_not_supported"
                : "drm_fairplaykey_is_not_supported"
            : ffmpegOk
              ? "valid_media"
              : "ffmpeg_failed";

          result.diagnostics = {
            ffmpegOk,
            isDrmProtected,
            raw: ffmpegRaw,
          };

          this.healthCache.set(url, result);
          return result;
        } catch (err) {
          result.ok = false;
          result.reason = err?.reason || "stream_health_exception";
          this.healthCache.set(url, result);
          return result;
        } finally {
          this.pendingHealth.delete(url);
        }
      })();

      this.pendingHealth.set(url, promise);
    }
    return await promise;
  }

  // -------------------------
  // MAIN RESOLVE
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
    if (!providers.length)
      throw new ProviderError(
        PROVIDER_ERROR.PROVIDER_NOT_FOUND,
        "No providers registered",
      );

    const provider = providerKey ? getProvider(providerKey) : null;

    // invalid provider early exit
    if (providerKey && !provider)
      throw this._buildError(
        new ProviderError(
          PROVIDER_ERROR.PROVIDER_NOT_FOUND,
          `Provider not found: ${providerKey}`,
        ),
        providers,
        providerKey,
      );

    const selectedProviders = provider ? [provider] : providers;
    const errors = [];

    const isRestricted = (dto) =>
      Boolean(
        dto?.metadata?.restriction &&
        dto.metadata.restriction.toLowerCase().includes("tiklt"),
      );

    for (const p of selectedProviders) {
      try {
        const raw = await this._executeWithRetry(p, channelKey);
        if (!raw || typeof raw !== "object")
          throw new ProviderError(
            PROVIDER_ERROR.INVALID_RESPONSE,
            "Provider returned invalid payload",
          );

        const dto = this._normalize(p, raw);
        const healthResult = await this._getStreamHealth(dto.streamUrl);
        const isDrm = healthResult.diagnostics.isDrmProtected === true;
        const restricted = isRestricted(dto);

        const isStreamable = healthResult.ok && !restricted && !isDrm;

        const result = {
          stream: new StreamDTO({
            ...dto,
            isStreamable,
            metadata: {
              ...dto.metadata,
              provider: dto.metadata.provider,
            },
          }),
          health: healthResult.ok ? "ok" : "bad",
          healthStage: healthResult.stage,
          reason: restricted
            ? "geo_restricted"
            : isDrm
              ? "drm_protected"
              : healthResult.ok
                ? "valid_media"
                : healthResult.reason,
          diagnostics: healthResult.diagnostics,
        };

        const ttl = this._computeTTL(dto);
        if (ttl > 0) {
          this.cache.set(
            cacheKey,
            result,
            healthResult.ok ? ttl : Math.min(ttl, 30),
          );
        }

        // console.log("STREAM ENGINE RESULT:");
        // console.dir(result, { depth: null });
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
        )
          throw err;
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
    return new StreamDTO({
      ...raw,
      metadata: {
        ...(raw.metadata || {}),
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
