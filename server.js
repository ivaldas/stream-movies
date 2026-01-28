// import "dotenv/config";
// import fs from "node:fs/promises";
import path from "node:path";
import { createWriteStream } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";

import home from "./routes/home.js";
import films from "./routes/filmsRoutes.js";
import stream from "./routes/streamRoutes.js";
import sql from "./routes/films_sql_routes.js";
import lrtRoutes from "./routes/lrtRoutes.js";

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
app.use(express.static(join(__dirname, "public")));

// Set up access log file stream
const accessLogStream = createWriteStream(
  join(__dirname, "logs", "access.log"),
  {
    flags: "a",
  },
);

// 🔹 Request ID middleware (ADD HERE)
app.use((req, res, next) => {
  const reqId =
    req.headers["x-request-id"] ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  req.requestId = reqId;
  res.setHeader("X-Request-Id", reqId);

  next();
});

app.use(cors());
app.use(helmet());
app.use(compression());
app.use(morgan("combined", { stream: accessLogStream }));

// ################ LIVE ROUTES ######################################

app.use("/live", lrtRoutes);

// ################ API ROUTES #######################################

app.use("/collection", films);
app.use("/collection", stream);
// app.use(home);

// ################ MYSQL ROUTES #####################################

app.use("/collection/sql", sql);

// ####################################################################
app.use(home);

const port = process.env.PORT || 5001;
app.listen(port, "0.0.0.0", () =>
  console.log(`Films API nodejs server listening at http://localhost:${port}`),
);
