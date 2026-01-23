import db from "./sql_connection.js";

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

/**
 * Get all films using JOIN + GROUP_CONCAT
 */
export const getSqlFilms = async (req, res) => {
  try {
    const titleFilter = req.query.title || "";

    const [films] = await db.execute(
      `
      SELECT 
        f.*,
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
      WHERE f.title LIKE ?
      GROUP BY f.film_id
      ORDER BY f.movieyear DESC, f.title ASC
    `,
      [`%${titleFilter}%`],
    );

    if (!films.length) return res.status(404).json({ films: [] });

    res.status(200).json(films.map(mapFilmRow));
  } catch (err) {
    console.error("Error fetching films:", err);
    res.status(500).send("Error fetching films");
  }
};

/**
 * Get single film by programid using JOIN + GROUP_CONCAT
 */
export const getSqlSingleFilm = async (req, res) => {
  try {
    const programid = req.params.id;

    const [result] = await db.execute(
      `
      SELECT 
        f.*,
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

    if (!result.length) return res.status(404).json({ film: null });

    res.status(200).json(mapFilmRow(result[0]));
  } catch (err) {
    console.error("Error fetching film:", err);
    res.status(500).send("Error fetching film");
  }
};
