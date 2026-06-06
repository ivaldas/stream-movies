import { spawn } from "node:child_process";

export function probeStreamWithFFmpeg(url, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const ff = spawn("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",

      "-headers",
      ["-user_agent", "Mozilla/5.0"].join(""),

      "-reconnect",
      "1",
      "-reconnect_streamed",
      "1",
      "-reconnect_delay_max",
      "2",

      "-t",
      "8",

      "-i",
      url,

      "-f",
      "null",
      "-",
    ]);

    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      ff.kill("SIGKILL");
    }, timeoutMs);

    ff.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    ff.on("close", (code) => {
      clearTimeout(timer);

      if (timedOut) {
        return resolve({ ok: false, reason: "timeout" });
      }

      if (code === 0) {
        return resolve({ ok: true });
      }

      if (stderr.includes("403")) {
        return resolve({ ok: false, reason: "geo_or_referer_blocked" });
      }

      if (stderr.includes("404")) {
        return resolve({ ok: false, reason: "not_found" });
      }

      return resolve({
        ok: false,
        reason: "ffmpeg_failed",
        raw: stderr,
      });
    });

    ff.on("error", () => {
      clearTimeout(timer);
      resolve({ ok: false, reason: "spawn_error" });
    });
  });
}
