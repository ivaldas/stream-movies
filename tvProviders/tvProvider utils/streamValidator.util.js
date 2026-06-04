import axios from "axios";

/**
 * Detects HLS stream validity:
 * - supports master playlists
 * - supports media playlists
 * - validates at least one segment (light probe)
 */
export async function validateStream(url) {
  try {
    const res = await axios.get(url, {
      timeout: 5000,
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "*/*",
      },
      responseType: "text",
      validateStatus: () => true,
    });

    if (res.status < 200 || res.status >= 400) {
      return false;
    }

    const text = String(res.data).trim();

    // must be HLS
    if (!text.startsWith("#EXTM3U")) {
      return false;
    }

    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const hasVariantPlaylist = text.includes("#EXT-X-STREAM-INF");
    const hasMediaSegments = text.includes("#EXTINF");

    // -----------------------------
    // CASE 1: MASTER PLAYLIST
    // -----------------------------
    if (hasVariantPlaylist && !hasMediaSegments) {
      const variantLine = lines.find((l) => l && !l.startsWith("#"));
      if (!variantLine) return false;

      const variantUrl = new URL(variantLine, url).href;

      const variantRes = await axios.get(variantUrl, {
        timeout: 5000,
        responseType: "text",
        validateStatus: () => true,
      });

      if (variantRes.status < 200 || variantRes.status >= 400) {
        return false;
      }

      const variantText = String(variantRes.data).trim();

      // if variant is still a playlist → accept as valid structure
      if (variantText.startsWith("#EXTM3U")) {
        return true;
      }

      return false;
    }

    // -----------------------------
    // CASE 2: MEDIA PLAYLIST
    // -----------------------------
    if (hasMediaSegments) {
      const mediaLine = lines.find((l) => l && !l.startsWith("#"));
      if (!mediaLine) return false;

      const mediaUrl = new URL(mediaLine, url).href;

      const probe = await axios.get(mediaUrl, {
        timeout: 5000,
        responseType: "arraybuffer",
        validateStatus: () => true,
      });

      if (probe.status < 200 || probe.status >= 400) {
        return false;
      }

      const buffer = Buffer.from(probe.data);

      // MPEG-TS
      const isMpegTs = buffer[0] === 0x47;

      // fMP4 (CMAF)
      const isFmp4 =
        buffer.length > 8 && buffer.toString("utf8", 4, 8) === "ftyp";

      return isMpegTs || isFmp4;
    }

    // -----------------------------
    // CASE 3: EDGE CASE (audio-only or simple playlist)
    // -----------------------------
    // If it's HLS but no segments detected, treat as valid structure
    // (audio HLS often falls here)
    return hasVariantPlaylist || text.includes("#EXT-X-TARGETDURATION");
  } catch {
    return false;
  }
}
