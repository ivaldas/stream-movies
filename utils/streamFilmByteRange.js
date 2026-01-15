import { createReadStream } from "node:fs";
import path from "node:path";
import mime from "mime-types";

import { getFileStats } from "./streamVideoFn.js";

/**
 * Stream a video file supporting byte-range requests.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {string} videoPath Absolute file path
 * @param {string} baseDir Base directory for extra security
 * @param {import('fs').FileHandle} [fileHandle] Optional open file handle from resolveVideoPath
 */

// // MIME types
// const mimeTypes = { '.mp4': 'video/mp4', '.mkv': 'video/x-matroska', '.webm': 'video/webm' };

// // Helper function to determine MIME type
// const getContentType = (videoPath) => {
//   const fileExtension = extname(videoPath.replace(/\.txt$/, '')).toLowerCase();
//   return mimeTypes[fileExtension] || 'application/octet-stream';
// }

// Native MP4 byte-range streaming (Browser-compatible)
const streamFilmByteRange = async (
  req,
  res,
  videoPath,
  baseDir,
  fileHandle
) => {
  let file;
  let ownFileHandle = false;

  try {
    // Use provided file handle or open the file ourselves
    if (fileHandle) {
      file = fileHandle;
    } else {
      const fsPromises = await import("node:fs/promises");
      file = await fsPromises.open(videoPath, "r");
      ownFileHandle = true;
    }

    // Prevent directory traversal
    const safeBase = path.resolve(baseDir) + path.sep;
    const safePath = path.resolve(videoPath);
    if (!safePath.startsWith(safeBase)) {
      res.writeHead(403);
      return res.end("Forbidden");
    }

    // Get file stats
    const stats = await getFileStats(safePath);
    const fileSize = stats.size;
    // const contentType = await getContentType(videoPath)
    const contentType =
      mime.contentType(safePath) || "application/octet-stream";

    const etag = `"${stats.ino}-${stats.size}-${stats.mtimeMs}"`;
    const lastModified = stats.mtime.toUTCString();

    const commonHeader = {
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable", // Cache the video for 1 year
      "Last-Modified": lastModified,
      ETag: etag,
    };

    // Handle HEAD requests (return headers only)
    if (req.method === "HEAD") {
      res.writeHead(200, {
        ...commonHeader,
        "Content-Length": fileSize,
      });
      return res.end(); // no body
    }

    const rangeHeader = req.headers.range;
    // If no range header, send the full file
    if (!rangeHeader) {
      res.writeHead(200, {
        ...commonHeader,
        "Content-Length": fileSize,
      });
      const stream = fileHandle
        ? file.createReadStream({ highWaterMark: 32 * 1024 * 1024 })
        : createReadStream(safePath, {
            highWaterMark: 32 * 1024 * 1024,
          }); // 32MB buffer
      stream.pipe(res);
      stream.on("error", (err) => {
        console.error("Stream error:", err);
        res.writeHead(500);
        res.end("Internal Server Error");
      });
      res.on("close", async () => {
        stream.destroy();
        if (ownFileHandle) await file.close();
      });
      return;
    }

    // Handle multiple ranges
    const ranges = rangeHeader
      .replace(/bytes=/, "")
      .split(",")
      .map((r) => {
        let [startStr, endStr] = r.split("-");
        let start, end;

        if (!startStr) {
          // Suffix bytes
          const suffixLength = Number(endStr);
          start = Math.max(fileSize - suffixLength, 0);
          end = fileSize - 1;
        } else {
          start = Number(startStr);
          end = endStr ? Number(endStr) : fileSize - 1;
        }

        if (
          isNaN(start) ||
          start < 0 ||
          start >= fileSize ||
          end >= fileSize ||
          end < start
        ) {
          return null; // invalid range
        }

        return { start, end };
      })
      .filter(Boolean);

    if (ranges.length === 0) {
      res.writeHead(416, { "Content-Range": `bytes */${fileSize}` });
      return res.end("Range Not Satisfiable");
    }

    // If only one range, stream normally
    if (ranges.length === 1) {
      const { start, end } = ranges[0];
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        ...commonHeader,
        "Content-Length": chunkSize,
      });

      const stream = fileHandle
        ? file.createReadStream({
            start,
            end,
            highWaterMark: 16 * 1024 * 1024,
          })
        : createReadStream(safePath, {
            start,
            end,
            highWaterMark: 16 * 1024 * 1024,
          });

      stream.pipe(res);
      stream.on("error", (err) => {
        console.error("Stream error:", err);
        res.writeHead(500);
        res.end("Internal Server Error");
      });

      res.on("close", async () => {
        stream.destroy();
        if (ownFileHandle) await file.close();
      });
      return;
    }

    // Multiple ranges (multipart/byteranges)
    const boundary = "MY_VIDEO_BOUNDARY_" + Date.now();
    res.writeHead(206, {
      "Content-Type": `multipart/byteranges; boundary=${boundary}`,
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable",
    });

    const pipeRange = async (i) => {
      if (i >= ranges.length) {
        res.end(`--${boundary}--`);
        if (ownFileHandle) await file.close();
        return;
      }

      const { start, end } = ranges[i];
      res.write(`--${boundary}\r\n`);
      res.write(`Content-Type: ${contentType}\r\n`);
      res.write(`Content-Range: bytes ${start}-${end}/${fileSize}\r\n\r\n`);

      const stream = fileHandle
        ? file.createReadStream({
            start,
            end,
            highWaterMark: 16 * 1024 * 1024,
          })
        : createReadStream(safePath, {
            start,
            end,
            highWaterMark: 16 * 1024 * 1024,
          });

      stream.pipe(res, { end: false });
      stream.on("end", () => {
        res.write("\r\n");
        pipeRange(i + 1);
      });

      stream.on("error", (err) => {
        console.error("Stream error:", err);
        res.end();
      });

      res.on("close", () => stream.destroy());
    };

    pipeRange(0);
  } catch (err) {
    console.error("File streaming error:", err);
    res.writeHead(500);
    res.end("Internal Server Error");
    if (ownFileHandle && file) await file.close();
  }
};

export default streamFilmByteRange;
