import express from "express";

import { getLiveTVStream } from "../controllers/liveTVStream.controller.js";

const router = express.Router();

router.get("/:provider", (req, res) => {
  return res.status(400).json({
    success: false,
    message: "Provider and channel are required",
  });
});

router.get("/:provider/:channel", getLiveTVStream);

export default router;
