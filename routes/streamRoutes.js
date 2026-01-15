import express from "express";

import streamFilm from "../controllers/streamFilm.js";

const app = express();

app.get("/stream/:id", streamFilm);

export default app;
