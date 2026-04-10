import { Request, Response } from "express";
import { findNewsByLang } from "../models/newsModel";
import { getCache, setCache } from "../services/cacheService";

export const getNewsController = async (
  req: Request,
  res: Response
) => {
  try {
    const lang = (req.query.lang as string) || "en";

    // 🔥 pagination params FIRST
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const cacheKey = `news_${lang}_${page}`;

    // ⚡ check cache
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        source: "cache",
        ...cached,
      });
    }

    // 🗄️ DB fetch
    const data = await findNewsByLang(lang, limit, offset);

    // 🖼️ image fallback
    const articles = data.map((n: any) => ({
      ...n,
      image_url:
        n.image_url ||
        "https://via.placeholder.com/400x250?text=News",
    }));

    const response = {
      success: true,
      source: "database",
      page,
      count: articles.length,
      articles,
    };

    // ⚡ save cache
    await setCache(cacheKey, response);

    return res.json(response);
  } catch (err) {
    console.error("Controller Error:", err);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};