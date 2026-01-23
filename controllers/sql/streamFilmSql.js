import { extname, dirname, basename, resolve } from "node:path";
import db from "./sql_connection.js";

import { findMp4FilesInFolder } from "../../utils/streamVideoFn.js";
import streamFilmByteRange from "../../utils/streamFilmByteRange.js";
import streamFilmWithFFmpeg from "../../utils/streamFilmWithFFmpeg.js";
import resolveVideoPath from "../../utils/resolveVideoPath.js";

const getFilmByProgramId = async (programid) => {
  const [rows] = await db.execute(
    `
    SELECT f.*, 
           GROUP_CONCAT(DISTINCT a.name) AS actors,
           GROUP_CONCAT(DISTINCT d.name) AS directors,
           GROUP_CONCAT(DISTINCT w.name) AS writers,
           GROUP_CONCAT(DISTINCT g.genre_name) AS programgenre
    FROM films f
    LEFT JOIN filmactors fa ON fa.film_id = f.film_id
    LEFT JOIN actors a ON a.actor_id = fa.actor_id
    LEFT JOIN filmdirectors fd ON fd.film_id = f.film_id
    LEFT JOIN directors d ON d.director_id = fd.director_id
    LEFT JOIN filmwriters fw ON fw.film_id = f.film_id
    LEFT JOIN writers w ON w.writer_id = fw.writer_id
    LEFT JOIN filmgenres fg ON fg.film_id = f.film_id
    LEFT JOIN genres g ON g.genre_id = fg.genre_id
    WHERE f.programid = ?
    GROUP BY f.film_id
    LIMIT 1
    `,
    [programid],
  );

  return rows[0] ?? null;
};

const mapFilmRow = (film) => ({
  file_path: film.file_path,
  full_path: film.full_path,
  directors: film.directors ? film.directors.split(",") : [],
  writers: film.writers ? film.writers.split(",") : [],
  actors: film.actors ? film.actors.split(",") : [],
  programgenre: film.programgenre ? film.programgenre.split(",") : [],
  movieyear: film.movieyear,
  title: film.title,
  description: film.description,
  isepisode: !!film.isepisode,
  isepisodic: !!film.isepisodic,
  seriesid: film.seriesid,
  programid: film.programid,
  starrating: parseFloat(film.starrating) || 0,
  mpaarating: film.mpaarating || "",
  image: film.image || "",
});

const streamFilmSql = async (req, res) => {
  try {
    const { id } = req.params;
    const filmRow = await getFilmByProgramId(id);
    if (!filmRow) return res.status(404).send("Film not found.");

    const foundFilm = mapFilmRow(filmRow);

    const originalPath = foundFilm.full_path.replace(/\.txt$/, "");
    const folderPath = dirname(originalPath);
    const baseFileName = basename(originalPath, extname(originalPath));

    const mp4FolderPath = resolve(
      folderPath,
      "Plex Versions",
      "Original Quality",
    );

    let mp4Files = [];
    try {
      mp4Files = await findMp4FilesInFolder(mp4FolderPath);
    } catch {
      mp4Files = [];
    }

    if (mp4Files.length > 0) {
      const exact = mp4Files.find(
        (file) => basename(file) === `${baseFileName}.mp4`,
      );
      const selected =
        exact ??
        mp4Files.find((file) => basename(file).startsWith(baseFileName)) ??
        mp4Files[0];

      const { path: safeMp4Path, file: mp4FileHandle } = await resolveVideoPath(
        selected,
        mp4FolderPath,
        [".mp4"],
      );
      console.log(
        "Range header:",
        req.headers.range,
        "Streaming MP4:",
        safeMp4Path,
      );
      return streamFilmByteRange(
        req,
        res,
        safeMp4Path,
        mp4FolderPath,
        mp4FileHandle,
      );
    }

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

export default streamFilmSql;
