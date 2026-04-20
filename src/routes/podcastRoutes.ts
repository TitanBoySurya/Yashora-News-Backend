import express from "express";
import { getPodcasts } from "../controllers/podcastController";

const router = express.Router();

// 🎧 GET podcasts
router.get("/podcasts", getPodcasts);

export default router;