import axios from "axios";
import { BaseProvider } from "./base.provider.js";
import { ProviderError, PROVIDER_ERROR } from "./error.provider.js";

const API_URL = "https://lnk.lt/api/video/video-config";

const extractExpiry = (url) => {
  try {
    const u = new URL(url);
    const t = Number(u.searchParams.get("tokenendtime"));
    return Number.isFinite(t) ? t * 1000 : null;
  } catch {
    return null;
  }
};

export class LNKProvider extends BaseProvider {
  constructor() {
    super("lnk", "LNK", {
      btv: { id: 137534 },
      lnk: { id: 137535 },
      "2tv": { id: 95343 },
      infotv: { id: 137748 },
      tv1: { id: 106791 },
    });
  }

  async _fetch(upstream, channelKey) {
    try {
      const { data } = await axios.get(`${API_URL}/${upstream.id}`, {
        timeout: 5000,
      });

      const v = data?.videoInfo;

      if (!v?.videoUrl) {
        throw new ProviderError(
          PROVIDER_ERROR.INVALID_RESPONSE,
          "Missing videoUrl",
          { channelKey, upstream },
        );
      }

      return {
        streamUrl: v.videoUrl,
        isLive: Boolean(v.isLive),
        expiresAt: extractExpiry(v.videoUrl),
        metadata: {
          title: v.title,
          channel: channelKey,
        },
      };
    } catch (err) {
      if (err instanceof ProviderError) throw err;

      throw new ProviderError(
        err.code === "ECONNABORTED"
          ? PROVIDER_ERROR.TIMEOUT
          : PROVIDER_ERROR.UPSTREAM_FAILED,
        "LNK upstream failed",
        {
          status: err?.response?.status,
        },
        err,
      );
    }
  }
}
