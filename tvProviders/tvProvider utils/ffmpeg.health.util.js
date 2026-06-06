import { probeStreamWithFFmpeg } from "./FFmpeg.probe.util.js";

export async function getFFmpegHealth(engine, url) {
  const cached = engine.ffmpegCache.get(url);
  if (cached) return cached;

  let result;

  try {
    await probeStreamWithFFmpeg(url);

    result = {
      ok: true,
      reason: "ffmpeg_ok",
      raw: null,
    };
  } catch (err) {
    const rawMessage = err?.message || String(err) || "ffmpeg_failed";

    result = {
      ok: false,
      reason: rawMessage, // the actual FFmpeg error
      raw: err, // full error object
    };
  }

  if (result.ok) {
    engine.ffmpegCache.set(url, result);
  }

  return result;
}
