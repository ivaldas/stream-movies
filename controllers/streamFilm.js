import { extname, dirname, basename, resolve } from "node:path";

import films_data from "../models/films_data.json" with { type: "json" };
import tv_shows_data from "../models/tv_shows_data.json" with { type: "json" };

import { findMp4FilesInFolder } from "../utils/streamVideoFn.js";
import streamFilmByteRange from "../utils/streamFilmByteRange.js";
import streamFilmWithFFmpeg from "../utils/streamFilmWithFFmpeg.js";
import resolveVideoPath from "../utils/resolveVideoPath.js";

// Main streaming handler
const streamFilm = async (req, res) => {
  try {
    const { id } = req.params;
    // Find film in DB
    const foundFilm = films_data.find(
      (film) => String(film.programid) === String(id),
    );
    if (!foundFilm) return res.status(404).send("Film not found.");

    // Base file path
    const originalPath = foundFilm["full_path"].replace(/\.txt$/, "");
    const folderPath = dirname(originalPath);
    // const baseFileName = basename(originalPath).replace(/\.(mkv|mp4|webm)$/i, '');
    const baseFileName = basename(originalPath, extname(originalPath)); // Remove extension

    // Construct the MP4 folder path (Plex Versions/Original Quality/)
    const mp4FolderPath = resolve(
      folderPath,
      "Plex Versions",
      "Original Quality",
    );

    // Find MP4 files in the specified folder
    let mp4Files = [];
    try {
      mp4Files = await findMp4FilesInFolder(mp4FolderPath);
    } catch {
      mp4Files = [];
    }

    // If MP4 files exist, check for a matching file
    if (mp4Files.length > 0) {
      // Prefer exact match first
      const exact = mp4Files.find(
        (file) => basename(file) === `${baseFileName}.mp4`,
      );
      const selected =
        exact ??
        mp4Files.find((file) => basename(file).startsWith(baseFileName)) ??
        mp4Files[0];

      // Resolve safely
      const { path: safeMp4Path, file: mp4FileHandle } = await resolveVideoPath(
        selected,
        mp4FolderPath,
        [".mp4"],
      );
      console.log("Streaming MP4:", safeMp4Path);

      // Stream using file handle (optional) or just path
      return streamFilmByteRange(
        req,
        res,
        safeMp4Path,
        mp4FolderPath,
        mp4FileHandle,
      );
    }

    // If no MP4 file is found, proceed with MKV or fallback logic
    const fileExtension = extname(originalPath).toLowerCase();

    if (fileExtension === ".mp4" || fileExtension === ".webm") {
      const { path: safePath, file: fileHandle } = await resolveVideoPath(
        basename(originalPath),
        folderPath,
        [".mp4", ".webm"],
      );
      return streamFilmByteRange(req, res, safePath, folderPath, fileHandle);
    } else if (fileExtension === ".mkv") {
      const { path: safeMkvPath, file: mkvFileHandle } = await resolveVideoPath(
        basename(originalPath),
        folderPath,
        [".mkv"],
      );
      return streamFilmWithFFmpeg(req, res, safeMkvPath, mkvFileHandle);
    } else {
      return res.status(415).send("Unsupported media type");
    }
  } catch (err) {
    console.error("Error during film streaming:", err.message);
    return res.status(500).send(err.message);
  }
};

export default streamFilm;

// Next Steps:
// Testing:
// Make sure to test the byte-range streaming with MP4 files and the FFmpeg conversion for MKV files.
// Ensure that seeking works in a browser with Content-Type: video/mp4.

// Optimization:
// For high traffic, consider adding caching, HLS/DASH support, or transcoding to handle different video formats.
