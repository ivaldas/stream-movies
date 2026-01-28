import express from "express";

import * as lrtController from "../controllers/LRT/lrt.js";

// const app = express();
const router = express.Router();

// app.use((req, res, next) => {
//   res.setHeader("Access-Control-Allow-Origin", "*");
//   res.setHeader("Access-Control-Allow-Methods", "GET");
//   res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
//   next();
// });

router.get("/lrt", lrtController.getLiveLTV);
router.get("/plius", lrtController.getLiveLTV2);
router.get("/lituanica", lrtController.getLiveWORLD);
router.get("/lr", lrtController.getLiveLR);
router.get("/klasika", lrtController.getLiveKlasika);
router.get("/opus", lrtController.getLiveOpus);

export default router;
