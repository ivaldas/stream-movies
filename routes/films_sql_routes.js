import express from "express";

import { createdb } from "../controllers/sql/sql_connection.js";
import { addFilms } from "../controllers/sql/insert_filmsdata_sql.js";
import {
  // createfilmstable,
  // createactorstable,
  // createpeopletable,
  // createdirectorstable,
  // createwriterstable,
  // creategenrestable,
  // createfilmactors,
  // createfilmdirectors,
  // createfilmwriters,
  // createfilmgenres,
  createAllTables,
} from "../controllers/sql/films_sql_tables.js";
import {
  getSqlFilms,
  getSqlSingleFilm,
} from "../controllers/sql/select_filmsdata_sql.js";

const app = express();

app.get("/sql/createdb", createdb);
// app.get("/sql/createfilmstable", createfilmstable);
// app.get("/sql/createactorstable", createactorstable);
// app.get("/sql/createpeopletable", createpeopletable);
// app.get("/sql/createdirectorstable", createdirectorstable);
// app.get("/sql/createwriterstable", createwriterstable);
// app.get("/sql/creategenrestable", creategenrestable);
// app.get("/sql/createfilmactors", createfilmactors);
// app.get("/sql/createfilmdirectors", createfilmdirectors);
// app.get("/sql/createfilmwriters", createfilmwriters);
// app.get("/sql/createfilmgenres", createfilmgenres);
app.get("/sql/createalltables", createAllTables);
app.get("/sql/addfilms", addFilms);
app.get("/films", getSqlFilms);
app.get("/films/:id", getSqlSingleFilm);

export default app;
