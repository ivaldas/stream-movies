import "dotenv/config";
import mysql from "mysql";

export const db = mysql.createConnection({
  host: "localhost",
  user: process.env.XAMPP_USER,
  password: process.env.XAMPP_PSW,
  database: "movies_api",
});
db.connect((err) => {
  if (err) {
    console.error("Error connecting: " + err.stack);
    return;
  }
  console.log(`Connection with xampp mysql established as id ${db.threadId}`);
});

export const createdb = async (req, res) => {
  let sql = "CREATE DATABASE movies_api";
  db.query(sql, (err, result) => {
    if (err) throw err;
    console.log(result);
    res.send("Database created.");
  });
};

export default db;
