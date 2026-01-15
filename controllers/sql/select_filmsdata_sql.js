import db from "./sql_connection.js";

export const getSqlFilms = async (req, res) => {
  //   let sql = "SELECT * FROM films";
  let sql = `
    SELECT films.film_id,films.file_path,films.full_path,films.movieyear,films.title,films.description,films.isepisode,films.isepisodic,films.seriesid,films.programid,films.starrating,films.mpaarating,films.image,
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
    ORDER BY films.title`;
  // HAVING GROUP_CONCAT(DISTINCT genres.genre_name) LIKE '%Science Fiction%'
  let query = db.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching data from database: " + err.stack);
      res.status(500).send("Error fetching data");
    } else {
      res.status(200).send(result);
    }
  });
};

export const getSqlSingleFilm = async (req, res) => {
  let sql = `SELECT * FROM films WHERE programid='${req.params.id}'`;
  let query = db.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching data from database: " + err.stack);
      res.status(500).send("Error fetching data");
    } else {
      res.status(200).send(result);
    }
  });
};
