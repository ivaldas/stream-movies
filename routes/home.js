import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const home = app.use("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/home/index.html"));
});

export default home;
