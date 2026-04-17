import { supabase } from "../config/supabase";

/**
 * 📰 FAST NEWS FETCH (Cursor-based pagination)
 * first call → lastDate = undefined
 * next call → lastDate = last item ka published_at
 */
export const findNewsByLang = async (
  lang: string,
  limit: number = 20,
  lastDate?: string
) => {
  try {
    let query = supabase
      .from("news_articles")
      .select("*")
      .eq("lang_code", lang)
      .order("published_at", { ascending: false })
      .limit(limit);

    // 🔥 cursor pagination (fast)
    if (lastDate) {
      query = query.lt("published_at", lastDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (err: any) {
    console.error("❌ findNewsByLang Error:", err.message);
    return [];
  }
};

/**
 * 🔁 Dedup check (optional use)
 */
export const checkNewsExists = async (link: string): Promise<boolean> => {
  try {
    if (!link) return false;

    const { data, error } = await supabase
      .from("news_articles")
      .select("id")
      .eq("link", link)
      .limit(1)
      .maybeSingle();

    if (error) return false;

    return !!data;
  } catch {
    return false;
  }
};

/**
 * 🗄️ Insert / Upsert news
 */
export const insertNews = async (news: any) => {
  try {
    if (!news?.link) return;

    const payload = {
      ...news,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("news_articles")
      .upsert(payload, {
        onConflict: "link", // 🔥 unique link required
      });

    if (error) {
      console.error("❌ Insert Error:", error.message);
    }
  } catch (err: any) {
    console.error("❌ Insert Catch Error:", err.message);
  }
};

/**
 * 🧹 Delete old news (auto cleanup)
 */
export const deleteOldNews = async (days: number = 2) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { error } = await supabase
      .from("news_articles")
      .delete()
      .lt("published_at", cutoffDate.toISOString());

    if (error) {
      console.error("❌ Cleanup Error:", error.message);
    } else {
      console.log(`🧹 Deleted news older than ${days} days`);
    }
  } catch (err: any) {
    console.error("❌ Cleanup Catch Error:", err.message);
  }
};