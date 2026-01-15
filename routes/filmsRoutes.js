import express from "express";

import {
  getFilms,
  getSingleFilm,
  createFilm,
  updateFilm,
  deleteFilm,
} from "../controllers/films.js";

const app = express();

app.get("/films", getFilms);
app.get("/films/:id", getSingleFilm);
app.post("/films", createFilm);
app.put("/films/:id", updateFilm);
app.delete("/films/:id", deleteFilm);

export default app;
