import db from "./sql_connection.js";

export const getSqlFilms = async (req, res) => {
  try {
    const sql = `
      SELECT films.film_id, films.file_path, films.full_path, films.movieyear, films.title, films.description, films.isepisode, films.isepisodic, films.seriesid, films.programid, films.starrating, films.mpaarating, films.image,
        GROUP_CONCAT(DISTINCT actors.name) AS actors,
        GROUP_CONCAT(DISTINCT directors.name) AS directors,
        GROUP_CONCAT(DISTINCT writers.name) AS writers,
        GROUP_CONCAT(DISTINCT genres.genre_name) AS genres
      FROM films
      LEFT JOIN filmactors ON films.film_id = filmactors.film_id
      LEFT JOIN actors ON filmactors.actor_id = actors.actor_id
      LEFT JOIN filmdirectors ON films.film_id = filmdirectors.film_id
      LEFT JOIN directors ON filmdirectors.director_id = directors.director_id
      LEFT JOIN filmwriters ON films.film_id = filmwriters.film_id
      LEFT JOIN writers ON filmwriters.writer_id = writers.writer_id
      LEFT JOIN filmgenres ON films.film_id = filmgenres.film_id
      LEFT JOIN genres ON filmgenres.genre_id = genres.genre_id
      GROUP BY films.film_id
      HAVING GROUP_CONCAT(DISTINCT genres.genre_name) LIKE '%%'
      ORDER BY films.title
    `;

    // Use the promise-based version of query
    const [result] = await db.query(sql);

    res.status(200).send(result);
  } catch (err) {
    console.error("Error fetching data from database: ", err);
    res.status(500).send("Error fetching data");
  }
};

export const getSqlSingleFilm = async (req, res) => {
  try {
    const sql = `SELECT * FROM films WHERE programid = ?`; // Use parameterized queries for security
    const [result] = await db.query(sql, [req.params.id]);

    if (result.length === 0) {
      return res.status(404).send("Film not found");
    }

    res.status(200).send(result);
  } catch (err) {
    console.error("Error fetching data from database: ", err);
    res.status(500).send("Error fetching data");
  }
};
