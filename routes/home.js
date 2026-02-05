import express from "express";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve the absolute path to index.html using path.resolve()
const homePagePath = resolve(__dirname, "../views/home/index.html");

router.get("/{*splat}", (req, res) => {
  res.sendFile(homePagePath, (err) => {
    if (err) {
      console.error("Error sending file:", err);
      res.status(500).send("Internal Server Error");
    }
  });
});

router.get("/{*splat}", (req, res) => {
  res.sendFile(join(__dirname, "../views/home/index.html"));
});

// router.get("/", (req, res) => {
//   res.sendFile(join(__dirname, "../views/home/index.html"));
// });

// router.get("/collection", (req, res) => {
//   res.sendFile(join(__dirname, "../views/home/index.html"));
// });

// router.get("/collection/sql", (req, res) => {
//   res.sendFile(join(__dirname, "../views/home/index.html"));
// });

// router.get("/collection/sql/stream", (req, res) => {
//   res.sendFile(join(__dirname, "../views/home/index.html"));
// });

export default router;
