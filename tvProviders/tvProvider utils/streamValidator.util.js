import axios from "axios";

/**
 * Stream validation result is intentionally richer than boolean
 */
export async function validateStream(url) {
  try {
    const res = await axios.get(url, {
      timeout: 5000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; StreamEngine/1.0)",
        Accept: "application/vnd.apple.mpegurl, application/x-mpegURL, */*",
      },
      responseType: "text",
      validateStatus: () => true,
      maxContentLength: 5_000_000,
      maxRedirects: 10,
    });

    const status = res.status;
    const text = String(res.data || "").trim();

    // -----------------------------
    // HTTP-level failures
    // -----------------------------
    if (status < 200 || status >= 400) {
      return { ok: false, reason: "http_error" };
    }

    // -----------------------------
    // Access denied / CDN blocks
    // -----------------------------
    if (
      text.includes("AccessDenied") ||
      text.includes("<Error>") ||
      text.includes("SignatureDoesNotMatch")
    ) {
      return { ok: false, reason: "access_denied" };
    }

    // -----------------------------
    // Must be HLS
    // -----------------------------
    if (!text.startsWith("#EXTM3U")) {
      return { ok: false, reason: "not_hls" };
    }

    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const hasVariant = text.includes("#EXT-X-STREAM-INF");
    const hasSegments = text.includes("#EXTINF");

    // -----------------------------
    // MASTER PLAYLIST
    // -----------------------------
    if (hasVariant && !hasSegments) {
      const variantLine = lines.find((l) => l && !l.startsWith("#"));
      if (!variantLine) return { ok: false, reason: "no_variant" };

      const variantUrl = new URL(variantLine, url).href;

      const variantRes = await axios.get(variantUrl, {
        timeout: 5000,
        responseType: "text",
        validateStatus: () => true,
      });

      if (variantRes.status < 200 || variantRes.status >= 400) {
        return { ok: false, reason: "variant_http_error" };
      }

      const variantText = String(variantRes.data || "");

      if (!variantText.startsWith("#EXTM3U")) {
        return { ok: false, reason: "invalid_variant" };
      }

      return { ok: true, reason: "master_playlist" };
    }

    // -----------------------------
    // MEDIA PLAYLIST
    // -----------------------------
    if (hasSegments) {
      const mediaLine = lines.find((l) => l && !l.startsWith("#"));
      if (!mediaLine) return { ok: false, reason: "no_media_segment" };

      const mediaUrl = new URL(mediaLine, url).href;

      const probe = await axios.get(mediaUrl, {
        timeout: 5000,
        responseType: "arraybuffer",
        validateStatus: () => true,
        maxContentLength: 2_000_000,
      });

      if (probe.status < 200 || probe.status >= 400) {
        return { ok: false, reason: "segment_http_error" };
      }

      const buffer = Buffer.from(probe.data);

      const isMpegTs = buffer[0] === 0x47;
      const isFmp4 =
        buffer.length > 8 && buffer.toString("utf8", 4, 8) === "ftyp";

      return {
        ok: isMpegTs || isFmp4,
        reason: isMpegTs || isFmp4 ? "valid_media" : "invalid_media",
      };
    }

    // -----------------------------
    // EDGE CASE (audio / simple HLS)
    // -----------------------------
    return {
      ok: hasVariant || text.includes("#EXT-X-TARGETDURATION"),
      reason: "edge_case",
    };
  } catch (err) {
    return { ok: false, reason: "streamvalidator_exception" };
  }
}
