import axios from "axios";

import { BaseProvider } from "./base.provider.js";
import { ProviderError, PROVIDER_ERROR } from "./errors/error.provider.js";
import { mapHttpError } from "./errors/httpErrorMapper.js";
import { StreamDTO } from "./dto/stream.contract.js";

const API_URL = "https://lnk.lt/api/video/video-config";

const extractExpiry = (url) => {
  try {
    const t = Number(new URL(url).searchParams.get("tokenendtime"));
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

      if (!v?.videoUrl || typeof v.videoUrl !== "string")
        throw new ProviderError(
          PROVIDER_ERROR.INVALID_RESPONSE,
          "Missing streamUrl",
          { channelKey, upstream },
        );

      const expiry = extractExpiry(v.videoUrl);

      return new StreamDTO({
        streamUrl: v.videoUrl.trim(),
        isLive: Boolean(v.isLive),
        isStreamable: !v.contentRestrict,
        expiresAt: expiry ? new Date(expiry) : null,
        metadata: {
          channel: channelKey,
          channelName: v.title,
          code: upstream.id,
          region: "Lithuania",
        },
      });
    } catch (err) {
      if (err instanceof ProviderError) throw err;

      throw mapHttpError(err, {
        provider: this.key,
        channel: channelKey,
        upstream: upstream.id,
      });
    }
  }
}
