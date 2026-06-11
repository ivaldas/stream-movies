import { getProviders, getProvider } from "../registry/providers.js";
import { StreamDTO } from "../dto/StreamDTO.contract.js";
import { ProviderError, PROVIDER_ERROR } from "../errors/ProviderError.js";
import { validateStream } from "../tvProvider utils/streamValidator.util.js";
import { getFFmpegHealth } from "../tvProvider utils/ffmpeg.health.util.js";
import { SingleFlightCache } from "../tvProvider utils/SingleFlightCache.js";

export class StreamEngine {
  constructor(options = {}) {
    this.MAX_TTL = options.maxTTL ?? 300;
    this.requestBudget = options.requestBudget ?? 50;

    this.cache = new SingleFlightCache({ stdTTL: 60, freeze: true });
    this.healthCache = new SingleFlightCache({ stdTTL: 60, freeze: true });
    this.ffmpegCache = new SingleFlightCache({ stdTTL: 600, freeze: false });
  }

  _key(p, c) {
    return `stream:${p || "any"}:${String(c).toLowerCase().trim()}`;
  }

  async _fetchPlaylistRecursive(
    url,
    depth = 0,
    timeoutMs = 10000,
    budget = this.requestBudget,
  ) {
    if (depth > 2) return "";
    if (budget <= 0) return "";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const text = await res.text();

      if (!text.includes("#EXT-X-STREAM-INF")) {
        return text;
      }

      const lines = text.split("\n");

      const variants = [];

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith("#EXT-X-STREAM-INF")) {
          const next = lines[i + 1]?.trim();

          if (next && !next.startsWith("#")) {
            variants.push(new URL(next, url).href);
          }
        }
      }

      const results = await Promise.allSettled(
        variants
          .slice(0, 8)
          .map((variant) =>
            this._fetchPlaylistRecursive(
              variant,
              depth + 1,
              timeoutMs,
              budget - 1,
            ),
          ),
      );

      let combined = text;

      for (const r of results) {
        if (r.status === "fulfilled") {
          combined += "\n" + r.value;
        }
      }

      return combined;
    } finally {
      clearTimeout(timeout);
    }
  }

  // -------------------------
  // HEALTH
  // -------------------------
  async _getStreamHealth(url) {
    return this.healthCache.resolve(url, async () => {
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

      const validation = await validateStream(url);

      if (!validation.ok) {
        result.reason = validation.reason;
        return result;
      }

      let playlistText = "";

      try {
        playlistText = await this._fetchPlaylistRecursive(url);
      } catch {
        result.reason = "playlist_fetch_failed";
        result.stage = "network_error";
        return result;
      }

      const hasSkd = /skd:\/\//i.test(playlistText);

      const hasWidevine = playlistText.toLowerCase().includes("widevine");

      const hasFairplay = /com\.apple\.streamingkeydelivery/i.test(
        playlistText,
      );

      const isDrmProtected = hasSkd || hasWidevine || hasFairplay;

      let ffmpeg;
      try {
        ffmpeg = await getFFmpegHealth(this, url);
      } catch (err) {
        ffmpeg = {
          ok: false,
          reason: "ffmpeg_failed",
          raw: err?.message ?? null,
        };
      }

      const ffmpegBlocked =
        ffmpeg.raw &&
        /skd|drm|decryption|unauthorized|fairplay|widevine|streamingkeydelivery/i.test(
          String(ffmpeg.raw),
        );

      const ffmpegOk = ffmpeg.ok && !ffmpegBlocked && !isDrmProtected;

      result.ok = ffmpegOk;

      result.stage = isDrmProtected ? "drm" : "ffmpeg";

      result.reason = result.reason = hasSkd
        ? "drm_skd_not_supported"
        : hasWidevine
          ? "drm_widevine_not_supported"
          : "drm_fairplay_not_supported";

      result.diagnostics = {
        ffmpegOk,
        isDrmProtected,
        raw: ffmpeg.raw ?? null,
      };

      return result;
    });
  }

  // -------------------------
  // MAIN RESOLVE
  // -------------------------
  async resolve(providerKey, channelKey) {
    const key = this._key(providerKey, channelKey);

    return this.cache.resolve(key, async () => {
      return this._resolveInternal(providerKey, channelKey);
    });
  }

  // -------------------------
  // CORE LOGIC
  // -------------------------
  async _resolveInternal(providerKey, channelKey) {
    const providers = getProviders();

    const provider = providerKey ? getProvider(providerKey) : null;

    if (providerKey && !provider) {
      const err = new ProviderError(
        PROVIDER_ERROR.PROVIDER_NOT_FOUND,
        `Provider not found: ${providerKey}`,
        {
          requestedProvider: providerKey,
        },
      );

      throw this._buildError(err, providers);
    }

    const list = provider ? [provider] : providers;

    const errors = [];
    for (const p of list) {
      try {
        const raw = await p.fetch(channelKey);

        const dto = new StreamDTO({
          ...raw,
          metadata: {
            ...(raw.metadata || {}),
            provider: p.displayName,
          },
        });

        const health = await this._getStreamHealth(dto.streamUrl);

        const restricted = Boolean(
          dto.metadata?.restriction &&
          dto.metadata.restriction.toLowerCase().includes("tiklt"),
        );

        const isDrm = health.diagnostics.isDrmProtected;

        const isStreamable = health.ok && !restricted && !isDrm;

        const isLive = dto.metadata?.static === true ? true : dto.isLive;

        return {
          stream: new StreamDTO({
            ...dto,
            isLive,
            isStreamable,
          }),
          health: health.ok ? "ok" : "bad",
          healthStage: health.stage,
          reason: restricted
            ? "geo_restricted"
            : isDrm
              ? "drm_protected"
              : health.reason,
          diagnostics: health.diagnostics,
        };
      } catch (err) {
        if (
          err instanceof ProviderError &&
          err.code === PROVIDER_ERROR.CHANNEL_NOT_FOUND
        ) {
          err.meta = {
            ...(err.meta || {}),
            providerKey: p.key,
          };
        }

        errors.push(
          err instanceof ProviderError ? this._buildError(err, providers) : err,
        );
      }
    }

    if (errors.length) {
      throw errors[0];
    }

    throw new ProviderError(
      PROVIDER_ERROR.UPSTREAM_FAILED,
      "All providers failed",
    );
  }

  // -------------------------
  // ERROR FIX (THIS RESTORES YOUR CHANNEL LIST FEATURE)
  // -------------------------
  _buildError(err, providers) {
    if (!(err instanceof ProviderError)) return err;

    const meta = { ...(err.meta || {}) };

    if (err.code === PROVIDER_ERROR.PROVIDER_NOT_FOUND) {
      meta.availableProviders = providers.map((p) => p.key);
    }

    if (err.code === PROVIDER_ERROR.CHANNEL_NOT_FOUND) {
      const p = providers.find(
        (x) => x.key === meta.providerKey || x.key === meta.requestedProvider,
      );

      meta.availableChannels = p ? p.getAvailableChannels() : [];
    }

    return new ProviderError(err.code, err.message, meta, err.cause);
  }
}
