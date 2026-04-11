import { Request, Response } from "express";
import { findNewsByLang } from "../models/newsModel";
import { getCache, setCache } from "../services/cacheService";

export const getNewsController = async (req: Request, res: Response) => {
  try {
    const lang = (req.query.lang as string) || "en";
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const cacheKey = `news_${lang}_page_${page}`;

    // ⚡ 1. Check Cache
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        source: "cache",
        ...cached,
      });
    }

    // 🗄️ 2. DB fetch (Ensure your findNewsByLang uses limit and offset)
    const data = await findNewsByLang(lang, limit, offset);

    // 🖼️ 3. Cleanup & Image Fallback
    const articles = data.map((n: any) => ({
      id: n.id,
      title: n.title,
      summary: n.summary || "AI is generating news summary...", // Fallback text
      image_url: n.image_url && n.image_url.startsWith('http') 
                  ? n.image_url 
                  : "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=1000&auto=format&fit=crop", // Professional fallback
      link: n.link,
      source: n.source || "News Update",
      published_at: n.published_at
    }));

    const response = {
      success: true,
      source: "database",
      page,
      count: articles.length,
      articles,
    };

    // ⚡ 4. Save to Cache (Keep it for 15-30 mins only)
    await setCache(cacheKey, response, 1800); 

    return res.json(response);
  } catch (err) {
    console.error("Controller Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};