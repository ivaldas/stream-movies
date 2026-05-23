import express from "express";

import { getLiveLNKChannel } from "../controllers/LNK/lnk.js";

const router = express.Router();

router.get("/:channel", getLiveLNKChannel);

export default router;
