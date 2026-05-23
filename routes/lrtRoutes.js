import express from "express";

import { getLiveChannel } from "../controllers/LRT/lrt.js";

const router = express.Router();

router.get("/:channel", getLiveChannel);

export default router;
