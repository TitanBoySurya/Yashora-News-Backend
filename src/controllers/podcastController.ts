import { Request, Response } from "express";
import { fetchPodcasts } from "../services/podcastService";

export const getPodcasts = async (req: Request, res: Response) => {
  try {
    const category = (req.query.category as string) || "motivational";

    const data = await fetchPodcasts(category);

    res.json({
      success: true,
      count: data.length,
      podcasts: data
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch podcasts"
    });
  }
};