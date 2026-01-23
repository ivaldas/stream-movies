import db from "./sql_connection.js";
import films_data from "../../models/films_data.json" with { type: "json" };

export const addFilms = async (req, res) => {
  try {
    for (const film of films_data) {
      await insertFilmTransactional(film);
    }
    res.status(200).send("All films added successfully.");
  } catch (err) {
    console.error(err);
    res.status(500).send(`Error adding films: ${err.message}`);
  }
};

// Insert a single film and its relations in a transaction
const insertFilmTransactional = async (film) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

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

    const episodeFlag = isepisode ? 1 : 0;
    const episodicFlag = isepisodic ? 1 : 0;

    // Check if film already exists
    const [existingFilm] = await connection.query(
      "SELECT film_id FROM films WHERE programid = ?",
      [programid],
    );

    let film_id;
    if (existingFilm.length === 0) {
      const [filmInsert] = await connection.query(
        `INSERT INTO films 
          (file_path, full_path, movieyear, title, description, 
          isepisode, isepisodic, seriesid, programid, starrating, mpaarating, image)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          file_path,
          full_path,
          movieyear,
          title,
          description,
          episodeFlag,
          episodicFlag,
          seriesid,
          programid,
          starrating,
          mpaarating,
          image,
        ],
      );
      film_id = filmInsert.insertId;
      console.log(`Inserted film "${title}" (ID: ${film_id})`);
    } else {
      film_id = existingFilm[0].film_id;
      console.log(`Film "${title}" already exists (ID: ${film_id})`);
    }

    // Batch insert people and genres
    await Promise.all([
      insertPeople(
        connection,
        directors,
        "directors",
        "filmdirectors",
        "director_id",
        film_id,
      ),
      insertPeople(
        connection,
        writers,
        "writers",
        "filmwriters",
        "writer_id",
        film_id,
      ),
      insertPeople(
        connection,
        actors,
        "actors",
        "filmactors",
        "actor_id",
        film_id,
      ),
      insertGenres(connection, programgenre, film_id),
    ]);

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    console.error(`Error inserting film "${film.title}": ${err.message}`);
    throw err;
  } finally {
    connection.release();
  }
};

// Batch insert crew
const insertPeople = async (
  connection,
  people,
  tableName,
  relationTable,
  idColumn,
  film_id,
) => {
  if (!people || people.length === 0) return;

  // Prepare names and remove duplicates
  const names = [
    ...new Set(
      people.map((p) => {
        if (p.includes("|")) {
          const [last, first] = p.split("|");
          return `${first.trim()} ${last.trim()}`.replace(/\s+/g, " ");
        } else {
          return p.trim().replace(/\s+/g, " ");
        }
      }),
    ),
  ];

  // Insert all people in batch
  const values = names.map(() => "(?)").join(",");
  const [result] = await connection.query(
    `INSERT INTO ${tableName} (name) VALUES ${values} 
     ON DUPLICATE KEY UPDATE ${idColumn} = ${idColumn}`,
    names,
  );

  // Get all IDs
  const [rows] = await connection.query(
    `SELECT ${idColumn}, name FROM ${tableName} WHERE name IN (?)`,
    [names],
  );

  // Insert into junction table
  const junctionValues = rows.map((row) => [film_id, row[idColumn]]);
  if (junctionValues.length > 0) {
    const placeholders = junctionValues.map(() => "(?, ?)").join(",");
    await connection.query(
      `INSERT IGNORE INTO ${relationTable} (film_id, ${idColumn}) VALUES ${placeholders}`,
      junctionValues.flat(),
    );
  }
};

// Batch insert genres
const insertGenres = async (connection, genres, film_id) => {
  if (!genres || genres.length === 0) return;

  const genreNames = [...new Set(genres.map((g) => g.trim()))];

  const values = genreNames.map(() => "(?)").join(",");
  await connection.query(
    `INSERT INTO genres (genre_name) VALUES ${values} 
     ON DUPLICATE KEY UPDATE genre_id = genre_id`,
    genreNames,
  );

  const [rows] = await connection.query(
    `SELECT genre_id, genre_name FROM genres WHERE genre_name IN (?)`,
    [genreNames],
  );

  const junctionValues = rows.map((row) => [film_id, row.genre_id]);
  if (junctionValues.length > 0) {
    const placeholders = junctionValues.map(() => "(?, ?)").join(",");
    await connection.query(
      `INSERT IGNORE INTO filmgenres (film_id, genre_id) VALUES ${placeholders}`,
      junctionValues.flat(),
    );
  }
};
