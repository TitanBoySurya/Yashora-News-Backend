import { Request, Response } from "express";
import { findNewsByLang } from "../models/newsModel";
import { getCache, setCache } from "../services/cacheService";
import { getFullArticle } from "../services/articleService";

// 🖼️ Fallback image
const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=1000&auto=format&fit=crop";

// 📰 NEWS LIST API (Cursor Pagination)
export const getNewsController = async (req: Request, res: Response) => {
  try {
    // ✅ Safe inputs
    const lang =
      typeof req.query.lang === "string" ? req.query.lang : "en";

    const limit =
      Number(req.query.limit) > 0 && Number(req.query.limit) <= 50
        ? Number(req.query.limit)
        : 20;

    const lastDate =
      typeof req.query.lastDate === "string"
        ? req.query.lastDate
        : undefined;

    // 🔥 Unique cache key
    const cacheKey = `news_${lang}_${lastDate || "latest"}_${limit}`;

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

    // 🧹 CLEAN DATA
    const articles = (data || []).map((n: any) => ({
      id: n.id,
      title: n.title || "Yashora News Update",
      summary:
        n.summary ||
        n.content ||
        "Tap to read full article",
      image_url:
        n.image_url && n.image_url.startsWith("http")
          ? n.image_url
          : DEFAULT_IMAGE,
      link: n.link || "",
      source: n.source || "Global News",
      published_at:
        n.published_at || new Date().toISOString(),
    }));

    // 🔥 NEXT CURSOR
    const nextLastDate =
      articles.length > 0
        ? articles[articles.length - 1].published_at
        : null;

    const response = {
      success: true,
      count: articles.length,
      lastDate: nextLastDate,
      articles,
    };

    // ⚡ CACHE SAVE (60 sec = fresh feel)
    await setCache(cacheKey, response, 60);

    return res.json({
      ...response,
      source: "database",
    });
  } catch (err: any) {
    console.error("❌ Controller Error:", err.message);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// 📖 FULL ARTICLE API
export const getArticleController = async (
  req: Request,
  res: Response
) => {
  try {
    const rawUrl = req.query.url;

    const url =
      typeof rawUrl === "string"
        ? decodeURIComponent(rawUrl)
        : "";

    if (!url) {
      return res.status(400).json({
        success: false,
        message: "URL required",
      });
    }

    const content = await getFullArticle(url);

    // 🔥 Empty content protection
    if (!content || content.length < 50) {
      return res.json({
        success: false,
        message: "Content not available",
      });
    }

    return res.json({
      success: true,
      content,
    });
  } catch (err: any) {
    console.error("❌ Article Error:", err.message);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};