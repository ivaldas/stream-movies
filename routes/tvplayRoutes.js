import express from "express";

import { getTVPlayStream } from "../controllers/TV3/tv3and6.js";

const router = express.Router();

router.get("/:channel", getTVPlayStream);

export default router;
