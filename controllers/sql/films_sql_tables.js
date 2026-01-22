import db from "./sql_connection.js";

// Utility to execute queries with promise
const executeQuery = async (sql) => {
  try {
    const [result] = await db.promise().query(sql);
    return result;
  } catch (err) {
    throw new Error(err.message);
  }
};

// Create films table
export const createfilmstable = async (req, res) => {
  const sql = `
    CREATE TABLE IF NOT EXISTS films (
      film_id INT AUTO_INCREMENT,
      file_path VARCHAR(255) NOT NULL,
      full_path VARCHAR(255),
      movieyear SMALLINT,
      title VARCHAR(100),
      description TEXT,
      isepisode VARCHAR(5),
      isepisodic VARCHAR(5),
      seriesid VARCHAR(30),
      programid VARCHAR(30),
      starrating FLOAT,
      mpaarating VARCHAR(5),
      image VARCHAR(255),
      PRIMARY KEY(film_id)
    )
  `;
  try {
    await executeQuery(sql);
    res.send("Films table created successfully");
  } catch (err) {
    res.status(500).send(`Error creating films table: ${err.message}`);
  }
};

// Create actors table
export const createactorstable = async (req, res) => {
  const sql = `
    CREATE TABLE IF NOT EXISTS actors (
      actor_id INT AUTO_INCREMENT,
      name VARCHAR(30) NOT NULL,
      PRIMARY KEY(actor_id)
    )
  `;
  try {
    await executeQuery(sql);
    res.send("Actors table created successfully");
  } catch (err) {
    res.status(500).send(`Error creating actors table: ${err.message}`);
  }
};

// Create directors table
export const createdirectorstable = async (req, res) => {
  const sql = `
    CREATE TABLE IF NOT EXISTS directors (
      director_id INT AUTO_INCREMENT,
      name VARCHAR(30) NOT NULL,
      PRIMARY KEY(director_id)
    )
  `;
  try {
    await executeQuery(sql);
    res.send("Directors table created successfully");
  } catch (err) {
    res.status(500).send(`Error creating directors table: ${err.message}`);
  }
};

// Create writers table
export const createwriterstable = async (req, res) => {
  const sql = `
    CREATE TABLE IF NOT EXISTS writers (
      writer_id INT AUTO_INCREMENT,
      name VARCHAR(30) NOT NULL,
      PRIMARY KEY(writer_id)
    )
  `;
  try {
    await executeQuery(sql);
    res.send("Writers table created successfully");
  } catch (err) {
    res.status(500).send(`Error creating writers table: ${err.message}`);
  }
};

// Create genres table
export const creategenrestable = async (req, res) => {
  const sql = `
    CREATE TABLE IF NOT EXISTS genres (
      genre_id INT AUTO_INCREMENT,
      genre_name VARCHAR(30) NOT NULL,
      PRIMARY KEY(genre_id)
    )
  `;
  try {
    await executeQuery(sql);
    res.send("Genres table created successfully");
  } catch (err) {
    res.status(500).send(`Error creating genres table: ${err.message}`);
  }
};

// Create film-actors junction table
export const createfilmactors = async (req, res) => {
  const sql = `
    CREATE TABLE IF NOT EXISTS filmactors (
      film_id INT,
      actor_id INT,
      PRIMARY KEY(film_id, actor_id),
      FOREIGN KEY(film_id) REFERENCES films(film_id),
      FOREIGN KEY(actor_id) REFERENCES actors(actor_id)
    )
  `;
  try {
    await executeQuery(sql);
    res.send("Film-actors table created successfully");
  } catch (err) {
    res.status(500).send(`Error creating film-actors table: ${err.message}`);
  }
};

// Create film-directors junction table
export const createfilmdirectors = async (req, res) => {
  const sql = `
    CREATE TABLE IF NOT EXISTS filmdirectors (
      film_id INT,
      director_id INT,
      PRIMARY KEY(film_id, director_id),
      FOREIGN KEY(film_id) REFERENCES films(film_id),
      FOREIGN KEY(director_id) REFERENCES directors(director_id)
    )
  `;
  try {
    await executeQuery(sql);
    res.send("Film-directors table created successfully");
  } catch (err) {
    res.status(500).send(`Error creating film-directors table: ${err.message}`);
  }
};

// Create film-writers junction table
export const createfilmwriters = async (req, res) => {
  const sql = `
    CREATE TABLE IF NOT EXISTS filmwriters (
      film_id INT,
      writer_id INT,
      PRIMARY KEY(film_id, writer_id),
      FOREIGN KEY(film_id) REFERENCES films(film_id),
      FOREIGN KEY(writer_id) REFERENCES writers(writer_id)
    )
  `;
  try {
    await executeQuery(sql);
    res.send("Film-writers table created successfully");
  } catch (err) {
    res.status(500).send(`Error creating film-writers table: ${err.message}`);
  }
};

// Create film-genres junction table
export const createfilmgenres = async (req, res) => {
  const sql = `
    CREATE TABLE IF NOT EXISTS filmgenres (
      film_id INT,
      genre_id INT,
      PRIMARY KEY(film_id, genre_id),
      FOREIGN KEY(film_id) REFERENCES films(film_id),
      FOREIGN KEY(genre_id) REFERENCES genres(genre_id)
    )
  `;
  try {
    await executeQuery(sql);
    res.send("Film-genres table created successfully");
  } catch (err) {
    res.status(500).send(`Error creating film-genres table: ${err.message}`);
  }
};

// export const createfilmstable = async (req, res) => {
//   let sql =
//     "CREATE TABLE IF NOT EXISTS films(film_id INT AUTO_INCREMENT,file_path VARCHAR(255) NOT NULL,full_path VARCHAR(255),movieyear SMALLINT,title VARCHAR(100),description TEXT,isepisode VARCHAR(5),isepisodic VARCHAR(5),seriesid VARCHAR(30),programid VARCHAR(30),starrating FLOAT,mpaarating VARCHAR(5),image VARCHAR(255),PRIMARY KEY(film_id))";
//   db.query(sql, (err, result) => {
//     if (err) throw err;
//     console.log(result);
//     res.send("films table created");
//   });
// };

// export const createactorstable = async (req, res) => {
//   const sql =
//     "CREATE TABLE IF NOT EXISTS actors(actor_id INT AUTO_INCREMENT,name VARCHAR(30) NOT NULL,PRIMARY KEY(actor_id))";
//   db.query(sql, (err, result) => {
//     if (err) throw err;
//     console.log(result);
//     res.send("actors table created");
//   });
// };
// // export const createpeopletable = async (req, res) => {
// //   const sql =
// //     "CREATE TABLE IF NOT EXISTS people(person_id INT AUTO_INCREMENT,name VARCHAR(100) NOT NULL,PRIMARY KEY(person_id))";
// //   db.query(sql, (err, result) => {
// //     if (err) throw err;
// //     console.log(result);
// //     res.send("people table created");
// //   });
// // };

// export const createdirectorstable = async (req, res) => {
//   const sql =
//     "CREATE TABLE IF NOT EXISTS directors(director_id INT AUTO_INCREMENT,name VARCHAR(30) NOT NULL,PRIMARY KEY(director_id))";
//   db.query(sql, (err, result) => {
//     if (err) throw err;
//     console.log(result);
//     res.send("directors table created");
//   });
// };

// export const createwriterstable = async (req, res) => {
//   const sql =
//     "CREATE TABLE IF NOT EXISTS writers(writer_id INT AUTO_INCREMENT,name VARCHAR(30) NOT NULL,PRIMARY KEY(writer_id))";
//   db.query(sql, (err, result) => {
//     if (err) throw err;
//     console.log(result);
//     res.send("writers table created");
//   });
// };

// export const creategenrestable = async (req, res) => {
//   const sql =
//     "CREATE TABLE IF NOT EXISTS genres(genre_id INT AUTO_INCREMENT,genre_name VARCHAR(30) NOT NULL,PRIMARY KEY(genre_id))";
//   db.query(sql, (err, result) => {
//     if (err) throw err;
//     console.log(result);
//     res.send("genres table created");
//   });
// };

// export const createfilmactors = async (req, res) => {
//   const sql =
//     "CREATE TABLE IF NOT EXISTS filmactors(film_id INT,actor_id INT,PRIMARY KEY(film_id,actor_id),FOREIGN KEY(film_id) REFERENCES films(film_id),FOREIGN KEY(actor_id) REFERENCES actors(actor_id))";
//   db.query(sql, (err, result) => {
//     if (err) throw err;
//     console.log(result);
//     res.send("filmactors table created");
//   });
// };
// export const createfilmdirectors = async (req, res) => {
//   const sql =
//     "CREATE TABLE IF NOT EXISTS filmdirectors(film_id INT,director_id INT,PRIMARY KEY(film_id,director_id),FOREIGN KEY(film_id) REFERENCES films(film_id),FOREIGN KEY(director_id) REFERENCES directors(director_id))";
//   db.query(sql, (err, result) => {
//     if (err) throw err;
//     console.log(result);
//     res.send("filmdirectors table created");
//   });
// };
// export const createfilmwriters = async (req, res) => {
//   const sql =
//     "CREATE TABLE IF NOT EXISTS filmwriters(film_id INT,writer_id INT,PRIMARY KEY(film_id,writer_id),FOREIGN KEY(film_id) REFERENCES films(film_id),FOREIGN KEY(writer_id) REFERENCES writers(writer_id))";
//   db.query(sql, (err, result) => {
//     if (err) throw err;
//     console.log(result);
//     res.send("filmwriters table created");
//   });
// };
// export const createfilmgenres = async (req, res) => {
//   const sql =
//     "CREATE TABLE IF NOT EXISTS filmgenres(film_id INT,genre_id INT,PRIMARY KEY(film_id,genre_id),FOREIGN KEY(film_id) REFERENCES films(film_id),FOREIGN KEY(genre_id) REFERENCES genres(genre_id))";
//   db.query(sql, (err, result) => {
//     if (err) throw err;
//     console.log(result);
//     res.send("filmwgenres table created");
//   });
// };
