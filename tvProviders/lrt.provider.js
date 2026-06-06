import axios from "axios";

import { BaseProvider } from "./base.provider.js";
import { ProviderError, PROVIDER_ERROR } from "./errors/error.provider.js";
import { mapHttpError } from "./errors/httpErrorMapper.js";
import { StreamDTO } from "./dto/stream.contract.js";

const API_URL = "https://www.lrt.lt/servisai/stream_url/live/get_live_url.php";

const extractExpiry = (url) => {
  try {
    const t = Number(new URL(url).searchParams.get("Expires"));
    return Number.isFinite(t) ? t * 1000 : null;
  } catch {
    return null;
  }
};

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

  async _fetch(upstream, channelKey) {
    try {
      const { data } = await axios.get(API_URL, {
        params: { channel: upstream.code },
        timeout: 5000,
      });
      const payload = data?.response?.data;

      if (
        !payload ||
        typeof payload.content !== "string" ||
        !payload.content.trim()
      )
        throw new ProviderError(
          PROVIDER_ERROR.INVALID_RESPONSE,
          "Missing streamUrl",
          { channelKey, upstream },
        );

      const expiry = extractExpiry(payload.content);

      return new StreamDTO({
        streamUrl: payload.content.trim(),
        backupStreamUrl: payload.content2 ?? null,
        audioUrl: payload.audio ?? null,
        isLive: true,
        // isStreamable: !payload.restriction,
        expiresAt: expiry ? new Date(expiry) : null,
        metadata: {
          channel: channelKey,
          channelName: upstream.name,
          code: upstream.code,
          hasBackup: !!payload.content2,
          hasAudio: !!payload.audio,
          restriction: payload.restriction || null,
          responseTime: payload.time || null,
          region: "Lithuania",
        },
      });
    } catch (err) {
      if (err instanceof ProviderError) throw err;

      throw mapHttpError(err, {
        provider: this.key,
        channel: upstream.code,
      });
    }
  }
}
