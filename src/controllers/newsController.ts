import { Request, Response } from "express";
import { findNewsByLang } from "../models/newsModel";
import { getCache, setCache } from "../services/cacheService";

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=1000&auto=format&fit=crop";

export const getNewsController = async (req: Request, res: Response) => {
  try {
    // ✅ language
    const lang =
      typeof req.query.lang === "string" ? req.query.lang : "en";

    // ✅ limit
    const limit =
      Number(req.query.limit) > 0 && Number(req.query.limit) <= 50
        ? Number(req.query.limit)
        : 20;

    // 🔥 cursor आधारित pagination (IMPORTANT)
    const lastDate =
      typeof req.query.lastDate === "string"
        ? req.query.lastDate
        : undefined;

    const cacheKey = `news_${lang}_${lastDate || "first"}_${limit}`;

    // ⚡ CACHE CHECK
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({
        ...cached,
        source: "cache",
      });
    }

    // 🗄️ DATABASE FETCH (cursor based)
    const data = await findNewsByLang(lang, limit, lastDate);

    // 🖼️ CLEAN DATA
    const articles = (data || []).map((n: any) => ({
      id: n.id,
      title: n.title || "No Title",
      summary:
        n.summary ||
        n.content ||
        "No description available",
      image_url:
        n.image_url && n.image_url.startsWith("http")
          ? n.image_url
          : DEFAULT_IMAGE,
      link: n.link || "",
      source: n.source || "Global News",
      published_at: n.published_at || new Date().toISOString(),
    }));

    // 🔥 next page ke liye cursor
    const nextLastDate =
      articles.length > 0
        ? articles[articles.length - 1].published_at
        : null;

    const response = {
      success: true,
      count: articles.length,
      lastDate: nextLastDate, // 👈 frontend isko use karega
      articles,
    };

    // ⚡ CACHE SAVE
    await setCache(cacheKey, response, 900);

    return res.json(response);
  } catch (err: any) {
    console.error("❌ Controller Error:", err.message);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};