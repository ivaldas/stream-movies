// import "dotenv/config";
// import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";

import home from "./routes/home.js";
import films from "./routes/filmsRoutes.js";
import stream from "./routes/streamRoutes.js";
import sql from "./routes/films_sql_routes.js";

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));
app.use(cors());
app.use(helmet());
app.use(compression());

// ################ API ROUTES #######################################

app.use("/collection", films);
app.use("/collection", stream);
// app.use(home);

// ################ MYSQL ROUTES #####################################

app.use("/", sql);
app.use("/sql/collection", sql);

// ####################################################################
app.use(home);

const port = process.env.PORT || 5001;
app.listen(port, "0.0.0.0", () =>
  console.log(`Films API nodejs server listening at http://localhost:${port}`)
);
