import { Request, Response } from "express";
import { findPodcastsByCategory } from "../models/podcastModel";

/**
 * 🎧 PODCAST LIST API
 */
export const getPodcasts = async (req: Request, res: Response) => {
  try {
    // 1. Category input lo (Default 'stories')
    const category = typeof req.query.category === "string" ? req.query.category : "stories";

    // 2. Database (Supabase) se data lao
    const data = await findPodcastsByCategory(category);

    // 3. Response bhejo
    return res.json({
      success: true,
      count: data.length,
      podcasts: data.map((p: any) => ({
        id: p.id,
        title: p.title,
        description: p.description || "",
        audio_url: p.audio_url,
        image_url: p.image_url,
        source: p.source_name || "Yashora",
        duration: p.duration_sec ? `${Math.floor(p.duration_sec / 60)} min` : "0 min",
        published_at: p.created_at
      }))
    });

  } catch (err: any) {
    console.error("❌ Podcast Controller Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server Error: Podcasts fetch nahi ho paye"
    });
  }
};