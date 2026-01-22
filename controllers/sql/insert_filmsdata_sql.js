import db from "./sql_connection.js";

import films_data from "../../models/films_data.json" with { type: "json" };

export const addFilms = async (req, res) => {
  try {
    films_data.forEach((film) => {
      insertFilm(film);
    });
    // insertFilm(films_data)
    res.status(200).send("films added successfully");
  } catch (err) {
    res.status(404).send(err.message);
  }
};

function insertFilm(film) {
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
  db.query(checkFilmQuery, [film.programid], (err, result) => {
    if (err) {
      console.error("Error checking film existence:", err);
      return;
    }

    if (result[0].count === 0) {
      const insertFilmQuery =
        "INSERT INTO films (file_path, full_path, movieyear, title, description, isepisode, isepisodic, seriesid, programid, starrating, mpaarating, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
      db.query(
        insertFilmQuery,
        [
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
        ],
        (err, result) => {
          if (err) {
            console.error("Error inserting movie:", err);
            return;
          }

          const film_id = result.insertId; // Get the inserted film_id
          insertFilmCrew(
            directors,
            "directors",
            "filmdirectors",
            "director_id",
            film_id,
          );
          insertFilmCrew(
            writers,
            "writers",
            "filmwriters",
            "writer_id",
            film_id,
          );
          insertFilmCrew(actors, "actors", "filmactors", "actor_id", film_id);
          insertGenres(programgenre, film_id);
        },
      );
    } else {
      console.log("Film already exists.");
    }
  });
}

function insertFilmCrew(table, tableName, relationTable, person_id, film_id) {
  table.forEach((person) => {
    let personsName = person.replace("|", " ").toString();
    db.query(
      `SELECT ${person_id} FROM ${tableName} WHERE name = ?`,
      [personsName],
      (err, result) => {
        if (err) throw err;

        let personId;
        if (result.length > 0) {
          // person exists, use existing ID
          personId = result[0][`${person_id}`];
          console.log(`'${personsName}' already exists with ID: ${personId}`);
          db.query(
            `INSERT INTO ${relationTable} (film_id, ${person_id}) VALUES (?, ?)`,
            [film_id, personId],
            (err) => {
              if (err) console.error(`Error linking film with ${person}`, err);
            },
          );
        } else {
          // person does not exist, insert new person
          db.query(
            `INSERT INTO ${tableName} (name) VALUES (?)`,
            // "INSERT IGNORE INTO actors (name) VALUES (?) ON DUPLICATE KEY UPDATE actor_id = actor_id"
            [personsName],
            (err, result) => {
              if (err) {
                console.error(`Error inserting ${person}`, err);
                return;
              }
              const id = result.insertId;
              // Insert into film_person Table (Many-to-Many Relationship)
              db.query(
                `INSERT INTO ${relationTable} (film_id, ${person_id}) VALUES (?, ?)`,
                // 'UPDATE movies SET director_id = ? WHERE movie_id = ?',
                [film_id, id],
                (err) => {
                  if (err)
                    console.error(`Error linking film with ${person}:`, err);
                },
              );
            },
          );
        }
      },
    );
  });
}

function insertGenres(programgenre, film_id) {
  programgenre.forEach((genre) => {
    db.query(
      "INSERT INTO genres (genre_name) VALUES (?)",
      [genre],
      (err, result) => {
        if (err) {
          console.error("Error inserting genre:", err);
          return;
        }
        const genre_id = result.insertId;
        db.query(
          "INSERT INTO filmgenres (film_id, genre_id) VALUES (?, ?)",
          [film_id, genre_id],
          (err) => {
            if (err) console.error("Error linking film with genre:", err);
          },
        );
      },
    );
  });
}
