import { Request, Response } from "express";
import { findPodcastsByCategory } from "../models/podcastModel";

/**
 * 🎧 PODCAST LIST API
 */
export const getPodcasts = async (req: Request, res: Response) => {
  try {
    // 1. Category लो (Default 'stories')
    const category = typeof req.query.category === "string" ? req.query.category : "stories";

    // 2. Model का इस्तेमाल करके डेटा लाओ (जैसा तुमने बनाया है)
    const data = await findPodcastsByCategory(category);

    // 3. डेटा को Android App के लिए Format (Map) करो
    const formattedData = data.map((p: any) => ({
      id: p.id,
      title: p.title,
      description: p.description || "",
      audio_url: p.audio_url,
      image_url: p.image_url || "",
      source: p.source_name || "Yashora",
      // Seconds को Minute में बदलो (ताकि ऐप में अच्छा दिखे)
      duration: p.duration_sec ? `${Math.floor(p.duration_sec / 60)} min` : "10 min",
      published_at: p.created_at
    }));

    // 4. Response भेजो
    return res.json({
      success: true,
      count: formattedData.length,
      podcasts: formattedData
    });

  } catch (err: any) {
    console.error("❌ Podcast Controller Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server Error: पॉडकास्ट लोड नहीं हो पाए"
    });
  }
};