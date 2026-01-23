import express from "express";

import { createdb } from "../controllers/sql/sql_connection.js";
import { addFilms } from "../controllers/sql/insert_filmsdata_sql.js";
import { createAllTables } from "../controllers/sql/films_sql_tables.js";
import {
  getSqlFilms,
  getSqlSingleFilm,
} from "../controllers/sql/select_filmsdata_sql.js";

const app = express();

app.get("/sql/createdb", createdb);
app.get("/sql/createalltables", createAllTables);
app.get("/sql/addfilms", addFilms);
app.get("/films", getSqlFilms);
app.get("/films/:id", getSqlSingleFilm);

export default app;
