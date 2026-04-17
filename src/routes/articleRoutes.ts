import express from "express";
import { getFullArticle } from "../services/articleService";

const router = express.Router();

router.get("/", async (req, res) => {
  const url = req.query.url as string;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  const article = await getFullArticle(url);

  res.json(article);
});

export default router;