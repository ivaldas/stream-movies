import { BaseProvider } from "./BaseProvider.js";
import { ProviderError, PROVIDER_ERROR } from "./errors/ProviderError.js";
import { StreamDTO } from "./dto/StreamDTO.contract.js";
import { safeRequest } from "./tvProvider utils/safeRequest.js";

const API_URL = "https://www.lrt.lt/servisai/stream_url/live/get_live_url.php";

// -------------------------
// SIGNED URL DETECTION
// -------------------------
const isSignedUrl = (url) => {
  try {
    return (
      url.includes("Expires=") ||
      url.includes("Signature=") ||
      url.includes("Policy=") ||
      url.includes("Key-Pair-Id=")
    );
  } catch {
    return false;
  }
};

const extractExpiry = (url) => {
  try {
    const parsed = new URL(url);
    const expires = Number(parsed.searchParams.get("Expires"));

    return Number.isFinite(expires) ? expires * 1000 : null;
  } catch (err) {
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
    const { data } = await safeRequest({
      url: API_URL,
      timeout: 5000,
      provider: this.key,
      channel: upstream.code,
      axiosConfig: {
        params: { channel: upstream.code },
      },
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
        { provider: this.key, channel: channelKey },
      );

    const streamUrl = payload.content.trim();
    const audioUrl = payload.audio?.trim() ?? null;
    const backupStreamUrl = payload.content2?.trim() ?? null;

    const signed = isSignedUrl(streamUrl);
    const expiry = extractExpiry(streamUrl);

    return new StreamDTO({
      streamUrl,
      backupStreamUrl,
      audioUrl,
      expiresAt: expiry ? new Date(expiry) : null,
      metadata: {
        channel: channelKey,
        channelName: upstream.name,
        code: upstream.code,
        signed,
        hasBackup: !!backupStreamUrl,
        hasAudio: !!payload.audio,
        restriction: payload.restriction || null,
        responseTime: payload.time || null,
        region: "LT",
        static: false,
      },
    });
  }
}
