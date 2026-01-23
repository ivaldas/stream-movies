import express from "express";

import streamFilm from "../controllers/streamFilm.js";
import streamFilmSql from "../controllers/sql/streamFilmSql.js";

const app = express();

app.get("/stream/:id", streamFilm);
app.get("/sql/stream/:id", streamFilmSql);

export default app;
