import express from "express";

import { getLiveTVStream } from "../controllers/liveTVStream.controller.js";

const router = express.Router();

const validateParams = (req, res, next) => {
  const { provider, channel } = req.params;

  if (!provider || !channel) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_PARAMS",
        message: "Provider and channel are required",
      },
    });
  }

  next();
};

router.get("/:provider/:channel", validateParams, getLiveTVStream);

export default router;
