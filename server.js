// import "dotenv/config";
import { createWriteStream, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import express from "express";
import https from "node:https";
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

// app.use((req, res, next) => {
//   res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
//   res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
//   res.setHeader("Origin-Agent-Cluster", "?1");
//   next();
// });

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
app.use(express.static(join(__dirname, "public")));

// Request ID middleware (ADD HERE)
app.use((req, res, next) => {
  const reqId =
    req.headers["x-request-id"] ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  req.requestId = reqId;
  res.setHeader("X-Request-Id", reqId);

  next();
});

// Set up access log file stream
const accessLogStream = createWriteStream(
  join(__dirname, "logs", "access.log"),
  {
    flags: "a",
  },
);

app.use(
  cors({
    origin: "*", // Allowing all origins for development only
  }),
);
app.use(helmet());
app.use(compression());
morgan.token("id", (req) => req.requestId);
app.use(
  morgan(":id :method :url :status :response-time ms", {
    stream: accessLogStream,
  }),
);

// ################ LIVE ROUTES ######################################

app.use("/live", lrtRoutes);

// ################ API ROUTES #######################################

app.use("/collection", films);
app.use("/collection", stream);

// ################ MYSQL ROUTES #####################################

app.use("/collection/sql", sql);

// ####################################################################
app.use(home);

// Load the SSL certificate
const privateKey = readFileSync("private-key.pem", "utf8");
const certificate = readFileSync("server.crt", "utf8");

const credentials = { key: privateKey, cert: certificate };

const port = process.env.PORT || 5001;
const server = https.createServer(credentials, app);
server.listen(port, "0.0.0.0", () => {
  const address = server.address();
  console.log(
    `Films API nodejs server listening at ${address.address}:${port}`,
  );
});
// app.listen(port, "0.0.0.0", () =>
//   console.log(`Films API nodejs server listening at http://localhost:${port}`),
// );
