import "dotenv/config";
import mysql from "mysql2/promise";

// connection WITHOUT database (for creating it)
export const rootPool = mysql.createPool({
  host: "localhost",
  user: process.env.XAMPP_USER,
  password: process.env.XAMPP_PSW,
  waitForConnections: true,
  connectionLimit: 10,
});

// connection WITH database (for normal queries)
export const db = mysql.createPool({
  host: "localhost",
  user: process.env.XAMPP_USER,
  password: process.env.XAMPP_PSW,
  database: "movies_api",
  waitForConnections: true,
  connectionLimit: 10,
});

export const createdb = async (req, res) => {
  try {
    await rootPool.query("CREATE DATABASE IF NOT EXISTS movies_api");
    res.status(201).send("Database created or already exists.");
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// export const db = mysql.createConnection({
//   host: "localhost",
//   user: process.env.XAMPP_USER,
//   password: process.env.XAMPP_PSW,
//   database: "movies_api",
// });
// db.connect((err) => {
//   if (err) {
//     console.error("Error connecting: " + err.stack);
//     return;
//   }
//   console.log(`Connection with xampp mysql established as id ${db.threadId}`);
// });

// export const createdb = async (req, res) => {
//   let sql = "CREATE DATABASE movies_api";
//   db.query(sql, (err, result) => {
//     if (err) throw err;
//     console.log(result);
//     res.send("Database created.");
//   });
// };

export default db;
