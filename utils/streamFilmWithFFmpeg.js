import { spawn } from "node:child_process";

import { getVideoDuration, getFileStats } from "./streamVideoFn.js";

/**
 * FFmpeg-based streaming with cross-platform FileHandle support
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {string | { path: string, fd?: number }} videoInput Path string or FileHandle object
 * @param {import('fs').FileHandle} [fileHandle] Optional Node FileHandle
 */

// FFmpeg-based conversion from MKV to MP4 (supports partial range)
const streamFilmWithFFmpeg = async (req, res, videoInput, fileHandle) => {
  const isWindows = process.platform === "win32";

  // Determine FFmpeg input
  const fdInput = !isWindows && fileHandle?.fd !== undefined;
  const inputArg = fdInput
    ? `pipe:${fileHandle.fd}`
    : typeof videoInput === "string"
      ? videoInput
      : videoInput.path;

  try {
    // Get file stats (works with path or FileHandle)
    const stats = fileHandle?.stat
      ? await fileHandle.stat()
      : await getFileStats(inputArg);
    const fileSize = stats.size;
    const contentType = "video/mp4";

    // Get video duration in seconds
    const duration = await getVideoDuration(
      typeof videoInput === "string" ? videoInput : videoInput.path,
    );

    // Approximate startTime from byte-range (if provided)
    let startTime = 0;
    const range = req.headers.range;

    // Convert byte range → time offset
    if (range && duration > 0) {
      const [startStr] = range.replace(/bytes=/, "").split("-");
      const byteStart = Number(startStr);

      if (!isNaN(byteStart) && byteStart > 0 && duration > 0) {
        startTime = (byteStart / fileSize) * duration;
      }
    }

    if (req.method === "HEAD") {
      res.writeHead(200, {
        "Content-Type": contentType,
        "Accept-Ranges": "none",
        "Cache-Control": "no-store",
        Connection: "keep-alive",
      });
      return res.end();
    }

    delete req.headers.range;
    // Set response headers for streaming
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
      Connection: "keep-alive",
      "Accept-Ranges": "none",
      // 'Accept-Ranges': 'bytes',
      // 'Cache-Control': 'no-cache',
      "Transfer-Encoding": "chunked",
    });

    const ffmpegArgs = [
      "-hide_banner",
      "-analyzeduration",
      "2147483647",
      "-probesize",
      "2147483647",
      // "-hwaccel",
      // "cuda",
      // "-hwaccel_output_format",
      // "cuda",

      // '-ss', startTime.toString(),
      ...(startTime > 0 ? ["-ss", startTime.toFixed(3)] : []),
      "-i",
      inputArg,
      // videoPath, // Input file
      // '-noaccurate_seek',
      // '-copyts',
      // '-avoid_negative_ts', 'make_zero',
      "-sn",

      "-map",
      "0:v?",
      "-map",
      "0:a?",
      // "-map",
      // "0:v:0",
      // "-map",
      // "0:a:0",
      // '-map_chapters', '0',
      "-c:v",
      "copy", // Copy video codec (H.264 or similar)
      // '-strict', '-2',
      // '-c:s', 'copy',

      // ################### hevc_nvenc encoding ############################
      // "-c:v",
      // "hevc_nvenc",
      // "-preset",
      // "slow", // faster -> lower quality options:[default, slow, medium, fast, hp, hq, bd, ll, llhq, llhp, lossless, losslesshp]
      // "-tune",
      // "uhq", // options:[hq, uhq, ll, ull, lossless]
      // "-pix_fmt",
      // "rgb24", // options: [yuv420p, yuv422p, yuv444p, yuv420p10le, yuv422p10le, yuv444p10le, rgb24]
      // "-profile:v",
      // "rext", // options: [main, main10, rext]
      // "-level",
      // "6.2", // options: [auto, 1, 1.0, 2, 2.0, 2.1, -> 5, 5.0, 5.1, 5.2, 6, 6.0, 6.1, 6.2]
      // "-rc",
      // "cbr_hq", // options: [constqp, vbr, cbr, cbr_ld_hq, cbr_hq, vbr_hq, -rc-lookahead(0 to INT_MAX), -rc(-1 to INT_MAX)]
      // "-rc-lookahead",
      // "64",

      // #################### libx265 encoding ###############################
      // "-c:v",
      // "libx265",
      // "-preset",
      // "ultrafast", // options: [ultrafast, veryfast, faster, fast, medium, slow, slower, veryslow]
      // "-x265-params",
      // "profile=high10",
      // "-tune",
      // "ssim", // options: [psnr, ssim, grain, zerolatency, fastdecode, animation, none]
      // "-crf",
      // "23.976",
      // "-b:v",
      // "20M",
      // "-maxrate",
      // "40M",
      // "-bufsize",
      // "80M",

      // ################## libx264 encoding ##################################
      // "-c:v",
      // "libx264",
      // "-profile:v",
      // "high10", // options: [baseline, main, high, high10, high422, high444]
      // "-preset",
      // "slow", // options: [ultrafast, superfast, veryfast, fast, medium, slow, slower, veryslow, placebo]
      // "-tune",
      // "film", // options: [film, animation, grain, fastdecode, zerolatency, psnr, ssim, none]
      // "-crf",
      // "18",
      // "-b:v",
      // "20M",
      // "-maxrate",
      // "40M",
      // "-bufsize",
      // "80M",

      // ######################################################################

      // '-c:a', 'copy',
      "-c:a",
      "aac", // Audio codec (transcoded to AAC if necessary)
      // '-ac', '2',
      // '-movflags', 'frag_keyframe+empty_moov+faststart', // Enables faststart for MP4
      // '-movflags', 'frag_keyframe+empty_moov',
      "-movflags",
      "frag_keyframe+empty_moov+default_base_moof",
      // '-max_muxing_queue_size', '9999',
      "-frag_duration",
      "1000000", // 1 second fragments
      "-f",
      "mp4",
      // "-strict",
      // "experimental",
      "pipe:1", // Output to stdout (streaming)
    ];

    const ffmpeg = spawn("ffmpeg", ffmpegArgs, {
      stdio: fdInput
        ? ["ignore", "pipe", "pipe", fileHandle.fd]
        : ["ignore", "pipe", "pipe"],
    });
    // IMPORTANT: close unused FileHandle immediately
    if (!fdInput && fileHandle) {
      await fileHandle.close();
    }
    ffmpeg.stdout.pipe(res); // Pipe the FFmpeg output to the response

    // FFmpeg error handling
    ffmpeg.stderr.on("data", (data) =>
      console.error(`FFmpeg stderr: ${data.toString()}`),
    );

    let fileClosed = false;
    const closeFile = async () => {
      if (!fileClosed) {
        fileClosed = true;
        if (fdInput && fileHandle) {
          try {
            await fileHandle.close();
          } catch {} // ignore errors
        }
      }
      try {
        await fileHandle.close();
      } catch (e) {
        // ignore double-close or race errors
      }
    };

    const cleanup = async () => {
      if (!ffmpeg.killed) ffmpeg.kill("SIGKILL");
      await closeFile();
    };

    // Client disconnected
    req.on("close", cleanup);
    res.on("close", cleanup);

    ffmpeg.on("error", async (err) => {
      console.error("FFmpeg spawn error:", err);
      await cleanup();
      if (!res.headersSent) res.writeHead(500);
      res.end("Internal Server Error");
    });

    ffmpeg.on("exit", async (code, signal) => {
      await cleanup();
      if (code !== 0)
        console.error(`FFmpeg exited with code ${code}, signal ${signal}`);
      if (!res.writableEnded) res.end();
    });
  } catch (err) {
    console.error("Error in streamFilmWithFFmpeg:", err);
    if (!res.headersSent) res.writeHead(500);
    res.end("Internal Server Error");
  }
};

export default streamFilmWithFFmpeg;
