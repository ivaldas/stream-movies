import axios from "axios";
import { BaseProvider } from "./base.provider.js";
import { ProviderError, PROVIDER_ERROR } from "./errors/error.provider.js";

const API_URL = "https://www.lrt.lt/servisai/stream_url/live/get_live_url.php";

export class LRTProvider extends BaseProvider {
  constructor() {
    super("lrt", "LRT", {
      lrt: { code: "LTV1", name: "LRT Televizija" },
      plius: { code: "LTV2", name: "LRT Plius" },
      lituanica: { code: "WORLD", name: "LRT Lituanica" },
      lr: { code: "LR", name: "Lietuvos Radijas" },
      klasika: { code: "Klasika", name: "LRT Klasika" },
      opus: { code: "Opus", name: "LRT Opus" },
    });
  }

  async _fetch(upstream) {
    try {
      const { data } = await axios.get(API_URL, {
        params: { channel: upstream.code },
        timeout: 5000,
      });
      const payload = data?.response?.data;

      if (!payload?.content)
        throw new ProviderError(
          PROVIDER_ERROR.INVALID_RESPONSE,
          "Missing stream content",
          { upstream },
        );

      const ts = Number(payload.expiresAt);

      return {
        streamUrl: payload.content,
        backupStreamUrl: payload.content2 ?? null,
        audioUrl: payload.audio ?? null,
        isLive: true,
        expiresAt: Number.isFinite(ts) ? new Date(ts * 1000) : null,
        metadata: { channel: upstream.name },
        region: "Lithuania",
      };
    } catch (err) {
      if (err?.response?.status === 404) {
        throw new ProviderError(
          PROVIDER_ERROR.CHANNEL_NOT_FOUND,
          `Channel not found: ${channelKey}`,
          { provider: this.key },
          err,
        );
      }

      if (err instanceof ProviderError) throw err;

      throw new ProviderError(
        err.code === "ECONNABORTED"
          ? PROVIDER_ERROR.TIMEOUT
          : PROVIDER_ERROR.UPSTREAM_FAILED,
        "LRT upstream failed",
        { status: err?.response?.status, data: err?.response?.data },
        err,
      );
    }
  }
}
