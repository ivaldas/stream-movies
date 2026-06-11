import axios from "axios";

export async function validateStream(url) {
  try {
    const text = String(res.data || "").trim();

    // -----------------------------
    // CDN / SIGNED URL BLOCK
    // -----------------------------
    if (
      res.status === 403 ||
      text.includes("AccessDenied") ||
      text.includes("<Code>AccessDenied</Code>") ||
      text.includes("SignatureDoesNotMatch") ||
      text.includes("The request could not be satisfied")
    ) {
      return {
        ok: false,
        reason: "access_denied",
      };
    }
    const res = await axios.get(url, {
      timeout: 6000,
      headers: {
        "User-Agent": "Mozilla/5.0 (StreamEngine/1.0)",
        Accept: "*/*",
      },
      responseType: "text",
      validateStatus: () => true,
      maxRedirects: 10,
    });

    // must at least look like HLS
    if (!text.includes("#EXTM3U")) {
      return { ok: false, reason: "not_hls" };
    }

    // soft signals only (NO HARD FAILS)
    const hasHlsTags =
      text.includes("#EXTINF") || text.includes("#EXT-X-STREAM-INF");

    if (!hasHlsTags) {
      return { ok: false, reason: "no_hls_tags" };
    }

    const isHls =
      text.includes("#EXTM3U") ||
      text.includes("#EXTINF") ||
      text.includes("#EXT-X-STREAM-INF");

    if (!isHls) {
      return {
        ok: false,
        reason: "not_hls",
      };
    }

    return {
      ok: true,
      reason: "hls_detected",
      isMaster: text.includes("#EXT-X-STREAM-INF"),
    };
  } catch {
    return { ok: false, reason: "network_error" };
  }
}
