import express from "express";

import { getLiveTVStream } from "../controllers/liveTVStream.controller.js";

const router = express.Router();

router.get("/:provider/:channel", getLiveTVStream);

export default router;
