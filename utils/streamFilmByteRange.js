import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";

import { observeStream } from "./streamVideoFn.js";

const streamFilmByteRange = async (req, res, filePath) => {
  try {
    // Get file stats safely
    const stats = await stat(filePath);
    const fileSize = stats.size;

    const range = req.headers.range;

    if (!range) {
      res.writeHead(200, {
        "Content-Type": "video/mp4",
        "Content-Length": fileSize,
        "Accept-Ranges": "bytes",
      });
      createReadStream(filePath).pipe(res);
      return;
    }

    const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
    let start = parseInt(startStr, 10);
    let end = endStr ? parseInt(endStr, 10) : fileSize - 1;

    if (
      isNaN(start) ||
      isNaN(end) ||
      start > end ||
      start < 0 ||
      end >= fileSize
    ) {
      res.writeHead(416, { "Content-Range": `bytes */${fileSize}` });
      return res.end("Range Not Satisfiable");
    }

    const chunkSize = end - start + 1;

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": "video/mp4",
    });

    const stream = createReadStream(filePath, { start, end });
    observeStream({ req, res, stream, filePath, start, end });
    stream.pipe(res);
  } catch (err) {
    console.error("Streaming error:", err);
    res.writeHead(500);
    res.end("Internal Server Error");
  }
};

export default streamFilmByteRange;
