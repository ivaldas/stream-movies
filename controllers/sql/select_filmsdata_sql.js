import db from "./sql_connection.js";

export const getSqlFilms = async (req, res) => {
  try {
    const [films] = await db.execute(
      `
  SELECT films.film_id,
         films.file_path,
         films.full_path,
         films.movieyear,
         films.title,
         films.description,
         films.isepisode,
         films.isepisodic,
         films.seriesid,
         films.programid,
         films.starrating,
         films.mpaarating,
         films.image,
         GROUP_CONCAT(DISTINCT CONCAT(actors.name)) AS actors,
         GROUP_CONCAT(DISTINCT CONCAT(directors.name)) AS directors,
         GROUP_CONCAT(DISTINCT CONCAT(writers.name)) AS writers,
         GROUP_CONCAT(DISTINCT genres.genre_name) AS programgenre
  FROM films
  LEFT JOIN filmactors ON films.film_id = filmactors.film_id
  LEFT JOIN actors ON filmactors.actor_id = actors.actor_id
  LEFT JOIN filmdirectors ON films.film_id = filmdirectors.film_id
  LEFT JOIN directors ON filmdirectors.director_id = directors.director_id
  LEFT JOIN filmwriters ON films.film_id = filmwriters.film_id
  LEFT JOIN writers ON filmwriters.writer_id = writers.writer_id
  LEFT JOIN filmgenres ON films.film_id = filmgenres.film_id
  LEFT JOIN genres ON filmgenres.genre_id = genres.genre_id
  WHERE films.title LIKE ?  -- Example parameterized filter
  GROUP BY films.film_id
`,
      [`%${req.query.title || ""}%`],
    ); // Allow for dynamic title filtering via query parameters.

    // Check if films array is empty and return appropriate response
    if (films.length === 0) {
      return res.status(404).send("Films not found");
    }

    // Process the data to convert the concatenated strings into arrays
    const splitOrEmpty = (str) => (str ? str.split(",") : []);
    const processedFilms = films.map((film) => {
      return {
        file_path: film.file_path,
        full_path: film.full_path,
        directors: splitOrEmpty(film.directors),
        writers: splitOrEmpty(film.writers),
        actors: splitOrEmpty(film.actors),
        programgenre: splitOrEmpty(film.programgenre),
        movieyear: film.movieyear,
        title: film.title,
        description: film.description,
        isepisode: film.isepisode === "true", // converting string 'true'/'false' to boolean
        isepisodic: film.isepisodic === "true", // converting string 'true'/'false' to boolean
        seriesid: film.seriesid,
        programid: film.programid,
        starrating: parseFloat(film.starrating), // Convert rating to float
        mpaarating: film.mpaarating,
        image: film.image,
      };
    });

    res.status(200).send(processedFilms);
  } catch (err) {
    console.error("Error fetching data from database: ", err);
    res.status(500).send("Error fetching data");
  }
};

export const getSqlSingleFilm = async (req, res) => {
  try {
    // Use parameterized queries for security
    const sql = `
      SELECT films.film_id,
             films.file_path,
             films.full_path,
             films.movieyear,
             films.title,
             films.description,
             films.isepisode,
             films.isepisodic,
             films.seriesid,
             films.programid,
             films.starrating,
             films.mpaarating,
             films.image,
             GROUP_CONCAT(DISTINCT CONCAT(actors.name)) AS actors,
             GROUP_CONCAT(DISTINCT CONCAT(directors.name)) AS directors,
             GROUP_CONCAT(DISTINCT CONCAT(writers.name)) AS writers,
             GROUP_CONCAT(DISTINCT genres.genre_name) AS programgenre
      FROM films
      LEFT JOIN filmactors ON films.film_id = filmactors.film_id
      LEFT JOIN actors ON filmactors.actor_id = actors.actor_id
      LEFT JOIN filmdirectors ON films.film_id = filmdirectors.film_id
      LEFT JOIN directors ON filmdirectors.director_id = directors.director_id
      LEFT JOIN filmwriters ON films.film_id = filmwriters.film_id
      LEFT JOIN writers ON filmwriters.writer_id = writers.writer_id
      LEFT JOIN filmgenres ON films.film_id = filmgenres.film_id
      LEFT JOIN genres ON filmgenres.genre_id = genres.genre_id
      WHERE films.programid = ?
      GROUP BY films.film_id
    `;

    const [result] = await db.execute(sql, [req.params.id]);

    if (result.length === 0) {
      return res.status(404).send("Film not found");
    }

    // Process the data to convert concatenated strings into arrays
    const processedFilm = result.map((film) => {
      return {
        file_path: film.file_path,
        full_path: film.full_path,
        directors: film.directors ? film.directors.split(",") : [],
        writers: film.writers ? film.writers.split(",") : [],
        actors: film.actors ? film.actors.split(",") : [],
        programgenre: film.programgenre ? film.programgenre.split(",") : [],
        movieyear: film.movieyear,
        title: film.title,
        description: film.description,
        isepisode: film.isepisode === "true", // converting string 'true'/'false' to boolean
        isepisodic: film.isepisodic === "true", // converting string 'true'/'false' to boolean
        seriesid: film.seriesid,
        programid: film.programid,
        starrating: parseFloat(film.starrating), // Convert rating to float
        mpaarating: film.mpaarating,
        image: film.image,
      };
    })[0]; // Since we're only fetching one film, return the first element.

    res.status(200).send(processedFilm);
  } catch (err) {
    console.error("Error fetching data from database: ", err);
    res.status(500).send("Error fetching data");
  }
};
