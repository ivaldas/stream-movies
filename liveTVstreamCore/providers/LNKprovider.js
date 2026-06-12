import { BaseProvider } from "./BaseProvider.js";
import {
  ProviderError,
  PROVIDER_ERROR,
} from "../liveStream/errors/ProviderError.js";
import { StreamDTO } from "../liveStream/models/StreamDTO.contract.js";
import { safeRequest } from "../tvStream utils/safeRequest.js";

const API_URL = "https://lnk.lt/api/video/video-config";

// SIGNED URL DETECTION
const isSignedUrl = (url) => {
  try {
    const parsed = new URL(url);

    return (
      parsed.searchParams.has("tokenhash") ||
      parsed.searchParams.has("tokenendtime")
    );
  } catch {
    return false;
  }
};

// EXPIRE PARSING
const extractExpiry = (url) => {
  try {
    const parsed = new URL(url);
    const tokenendtime = Number(parsed.searchParams.get("tokenendtime"));

    return Number.isFinite(tokenendtime) ? tokenendtime * 1000 : null;
  } catch (err) {
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
    const { data } = await safeRequest({
      url: `${API_URL}/${upstream.id}`,
      timeout: 5000,
      provider: this.key,
      channel: channelKey,
    });

    const payload = data?.videoInfo;

    if (!payload?.videoUrl || typeof payload.videoUrl !== "string")
      throw new ProviderError(
        PROVIDER_ERROR.INVALID_RESPONSE,
        "Missing streamUrl",
        { provider: this.key, channel: channelKey },
      );

    const streamUrl = payload.videoUrl.trim();

    const signed = isSignedUrl(streamUrl);
    const expiry = extractExpiry(streamUrl);

    return new StreamDTO({
      streamUrl,
      isLive: Boolean(payload.isLive),
      expiresAt: expiry ? new Date(expiry) : null,
      metadata: {
        channel: channelKey,
        channelName: payload.title ?? channelKey,
        code: upstream.id,
        signed,
        region: "LT",
        static: false,
      },
    });
  }
}
