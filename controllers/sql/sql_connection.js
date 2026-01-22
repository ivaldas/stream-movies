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

// To log the connection ID when a connection is successfully established
const testConnection = async () => {
  try {
    const connection = await db.getConnection(); // Get a connection from the pool
    console.log(
      `Connection established with XAMPP MySQL, Connection ID: ${connection.threadId}`,
    );
    connection.release(); // Release the connection back to the pool
  } catch (err) {
    console.error("Error connecting to the database: " + err.message);
  }
};

// Test the connection
testConnection();

export const createdb = async (req, res) => {
  try {
    await rootPool.query("CREATE DATABASE IF NOT EXISTS movies_api");
    res.status(201).send("Database created or already exists.");
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

export default db;
