import { createReadStream } from "node:fs";
import path from "node:path";
import mime from "mime-types";

import { getFileStats } from "./streamVideoFn.js";

/**
 * Stream a video file with byte-range support.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {string} videoPath Absolute file path
 * @param {string} baseDir Base directory for security checks
 * @param {import('fs').FileHandle} [fileHandle] Optional FileHandle from resolveVideoPath
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
  fileHandle,
) => {
  let file;
  let ownFileHandle = false;
  let stream;

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
      stream = fileHandle
        ? file.createReadStream({ highWaterMark: 32 * 1024 * 1024 })
        : createReadStream(safePath, {
            highWaterMark: 32 * 1024 * 1024,
          }); // 32MB buffer
      stream.pipe(res);
      attachCleanup(stream, res, fileHandle, ownFileHandle);
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

    if (!ranges.length) {
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

      stream = fileHandle
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
      attachCleanup(stream, res, fileHandle, ownFileHandle);
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
        await safeClose(fileHandle, ownFileHandle);
        return;
      }

      const { start, end } = ranges[i];
      res.write(`--${boundary}\r\n`);
      res.write(`Content-Type: ${contentType}\r\n`);
      res.write(`Content-Range: bytes ${start}-${end}/${fileSize}\r\n\r\n`);

      stream = fileHandle
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

      stream.on("error", async (err) => {
        console.error("Stream error:", err);
        res.end();
        await safeClose(fileHandle, ownFileHandle);
      });

      res.on("close", () => stream.destroy());
    };

    pipeRange(0);
  } catch (err) {
    console.error("File streaming error:", err);
    res.writeHead(500);
    res.end("Internal Server Error");
    await safeClose(fileHandle, ownFileHandle);
  }
};

// Cleanup helper for stream + file handles
const attachCleanup = (stream, res, fileHandle, ownFileHandle) => {
  let cleaned = false;
  const cleanup = async () => {
    if (cleaned) return;
    cleaned = true;

    if (stream) stream.destroy();
    try {
      stream.destroy();
    } catch {}

    if (fileHandle) {
      try {
        await fileHandle.close();
      } catch {}
    }
  };

  res.on("close", cleanup);
  res.on("finish", cleanup); // also cover normal end
  stream.on("end", cleanup);
  stream.on("error", cleanup);
};

// Close file handles safely
const safeClose = async (fileHandle, ownFileHandle) => {
  if (!fileHandle) return;
  try {
    if (ownFileHandle || fileHandle) {
      await fileHandle.close();
    }
  } catch (err) {
    console.error("Error closing file handle:", err);
  }
};

export default streamFilmByteRange;
