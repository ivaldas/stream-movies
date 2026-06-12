import { spawn } from "node:child_process";

const MAX_STDERR = 10_000;

function classifyFFmpegError(stderr) {
  const err = stderr.toLowerCase();
  if (/timed? out|timeout/.test(err)) return "timeout";
  if (/connection.*refused/.test(err)) return "connection_refused";
  if (/403|forbidden|unauthori[sz]ed|access denied/.test(err))
    return "geo_or_referer_blocked";
  if (/404|not found/.test(err)) return "not_found";
  if (/invalid data|corrupt|decode/.test(err)) return "decode_error";

  return "ffmpeg_failed";
}

export function probeStreamWithFFmpeg(url, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const ff = spawn("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",

      "-user_agent",
      "Mozilla/5.0",

      "-reconnect",
      "1",
      "-reconnect_streamed",
      "1",
      "-reconnect_delay_max",
      "2",

      "-i",
      url,

      "-f",
      "null",
      "-",
    ]);

    const buffer = Buffer.alloc(MAX_STDERR);
    let offset = 0;
    let size = 0;
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      ff.kill("SIGTERM");
      const killTimer = setTimeout(() => {
        if (!ff.killed) ff.kill("SIGKILL");
      }, 1000);

      killTimer.unref?.();
    }, timeoutMs);

    timer.unref?.();

    ff.stderr.on("data", (chunk) => {
      const len = chunk.length;

      if (len >= MAX_STDERR) {
        chunk = chunk.subarray(len - MAX_STDERR);
        chunk.copy(buffer, 0);
        offset = 0;
        size = MAX_STDERR;
        return;
      }

      const remaining = MAX_STDERR - offset;

      if (len <= remaining) {
        chunk.copy(buffer, offset);
        offset += len;
      } else {
        chunk.copy(buffer, offset, 0, remaining);
        chunk.copy(buffer, 0, remaining);
        offset = len - remaining;
      }

      size = Math.min(size + len, MAX_STDERR);
    });

    ff.on("close", (code) => {
      clearTimeout(timer);

      const durationMs = Date.now() - start;

      let startIdx = offset - size;
      if (startIdx < 0) startIdx += MAX_STDERR;

      const stderr = Buffer.alloc(size);

      const firstPart = Math.min(size, MAX_STDERR - startIdx);

      buffer.copy(stderr, 0, startIdx, startIdx + firstPart);

      if (firstPart < size) {
        buffer.copy(stderr, firstPart, 0, size - firstPart);
      }

      const stderrText = stderr.toString("utf8");

      if (timedOut) {
        return resolve({
          ok: false,
          reason: "timeout",
          durationMs,
        });
      }

      if (code === 0) {
        return resolve({
          ok: true,
          reason: "ffmpeg_ok",
          durationMs,
        });
      }

      return resolve({
        ok: false,
        reason: classifyFFmpegError(stderrText),
        durationMs,
        ...(code ? { exitCode: code } : {}),
      });
    });

    ff.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        ok: false,
        reason: "spawn_error",
        raw: {
          message: err?.message,
          code: err?.code,
        },
        durationMs: Date.now() - start,
      });
    });
  });
}
