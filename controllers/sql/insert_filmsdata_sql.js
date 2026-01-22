import db from "./sql_connection.js";

import films_data from "../../models/films_data.json" with { type: "json" };

export const addFilms = async (req, res) => {
  try {
    for (const film of films_data) {
      await insertFilm(film);
    }
    res.status(200).send("Films added successfully");
  } catch (err) {
    res.status(404).send(`Error: ${err.message}`);
  }
};

const insertFilm = async (film) => {
  const {
    file_path,
    full_path,
    directors,
    writers,
    actors,
    programgenre,
    movieyear,
    title,
    description,
    isepisode,
    isepisodic,
    seriesid,
    programid,
    starrating,
    mpaarating,
    image,
  } = film;

  const checkFilmQuery =
    "SELECT COUNT(*) AS count FROM films WHERE programid = ?";
  const [checkFilmResult] = await db.query(checkFilmQuery, [film.programid]);

  if (checkFilmResult[0].count === 0) {
    const insertFilmQuery = `
      INSERT INTO films (file_path, full_path, movieyear, title, description, 
      isepisode, isepisodic, seriesid, programid, starrating, mpaarating, image) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [filmInsertResult] = await db.query(insertFilmQuery, [
      file_path,
      full_path,
      movieyear,
      title,
      description,
      isepisode,
      isepisodic,
      seriesid,
      programid,
      starrating,
      mpaarating,
      image,
    ]);

    const film_id = filmInsertResult.insertId;

    await insertFilmCrew(
      directors,
      "directors",
      "filmdirectors",
      "director_id",
      film_id,
    );
    await insertFilmCrew(
      writers,
      "writers",
      "filmwriters",
      "writer_id",
      film_id,
    );
    await insertFilmCrew(actors, "actors", "filmactors", "actor_id", film_id);
    await insertGenres(programgenre, film_id);
  } else {
    console.log("Film already exists.");
  }
};

const insertFilmCrew = async (
  table,
  tableName,
  relationTable,
  person_id,
  film_id,
) => {
  for (const person of table) {
    let personName = person.replace("|", " ").toString();

    const [result] = await db.query(
      `SELECT ${person_id} FROM ${tableName} WHERE name = ?`,
      [personName],
    );

    if (result.length > 0) {
      const personId = result[0][`${person_id}`];
      console.log(`'${personName}' already exists with ID: ${personId}`);

      // Insert into the relation table (Many-to-Many Relationship)
      await db.query(
        `INSERT INTO ${relationTable} (film_id, ${person_id}) VALUES (?, ?)`,
        [film_id, personId],
      );
    } else {
      // If person doesn't exist, insert new person
      const [insertResult] = await db.query(
        `INSERT INTO ${tableName} (name) VALUES (?)`,
        [personName],
      );
      const personId = insertResult.insertId;

      // Link film and person in relation table
      await db.query(
        `INSERT INTO ${relationTable} (film_id, ${person_id}) VALUES (?, ?)`,
        [film_id, personId],
      );
    }
  }
};

const insertGenres = async (programgenre, film_id) => {
  for (const genre of programgenre) {
    const [genreResult] = await db.query(
      "SELECT genre_id FROM genres WHERE genre_name = ?",
      [genre],
    );

    let genre_id;
    if (genreResult.length > 0) {
      genre_id = genreResult[0].genre_id;
    } else {
      // Insert genre if it doesn't exist
      const [insertGenreResult] = await db.query(
        "INSERT INTO genres (genre_name) VALUES (?)",
        [genre],
      );
      genre_id = insertGenreResult.insertId;
    }

    // Link genre to film
    await db.query("INSERT INTO filmgenres (film_id, genre_id) VALUES (?, ?)", [
      film_id,
      genre_id,
    ]);
  }
};
