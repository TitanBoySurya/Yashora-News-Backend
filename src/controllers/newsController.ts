import { Request, Response } from "express";
import { findNewsByLang } from "../models/newsModel";
import { getCache, setCache } from "../services/cacheService";

// Fallback image agar data mein photo na ho
const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=1000&auto=format&fit=crop";

export const getNewsController = async (req: Request, res: Response) => {
  try {
    // 1. Inputs (Lang, Limit, Cursor)
    const lang = typeof req.query.lang === "string" ? req.query.lang : "en";
    
    const limit = Number(req.query.limit) > 0 && Number(req.query.limit) <= 50
        ? Number(req.query.limit)
        : 20;

    // 🔥 Cursor Logic: User scrolling kar raha hai ya fresh news dekh raha hai?
    const lastDate = typeof req.query.lastDate === "string" ? req.query.lastDate : undefined;

    // 2. ⚡ Unique Cache Key
    const cacheKey = `news_${lang}_${lastDate || "latest"}_${limit}`;

    // 3. 🛡️ Check Redis Cache
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({
        ...cached,
        source: "cache", // Taaki testing mein pata chale redis chal raha hai
      });
    }

    // 4. 🗄️ Database Fetch (Using Cursor Pagination)
    const data = await findNewsByLang(lang, limit, lastDate);

    // 5. 🖼️ Data Cleaning & Mapping
    const articles = (data || []).map((n: any) => ({
      id: n.id,
      title: n.title || "Yashora News Update",
      // Summary ko detail view ke liye full rakhein
      summary: n.summary || "Tap right to read the full story.",
      image_url: (n.image_url && n.image_url.startsWith("http")) 
          ? n.image_url 
          : DEFAULT_IMAGE,
      link: n.link || "",
      source: n.source || "Yashora News",
      published_at: n.published_at, // Android isko next call ke liye lastDate cursor banayega
    }));

    // 6. 🔥 Calculate Next Cursor (Next page ke liye aakhri news ki date)
    const nextLastDate = articles.length > 0 
        ? articles[articles.length - 1].published_at 
        : null;

    const response = {
      success: true,
      count: articles.length,
      lastDate: nextLastDate, 
      articles,
    };

    // 7. ⚡ Save to Cache (Default 60s for Fresh News Feel)
    // Note: ensure cacheService.ts setCache TTL is 60 or 300
    await setCache(cacheKey, response); 

    return res.json({
        ...response,
        source: "database"
    });

  } catch (err: any) {
    console.error("❌ Controller Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};