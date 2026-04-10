import { supabase } from "../config/supabase";

// 📰 Get news with pagination
export const findNewsByLang = async (
  lang: string,
  limit: number,
  offset: number
) => {
  try {
    const { data, error } = await supabase
      .from("news_articles")
      .select("*")
      .eq("lang_code", lang)
      .order("published_at", { ascending: false })
      .range(offset, offset + limit - 1); // 🔥 pagination

    if (error) throw error;

    return data || [];
  } catch (err: any) {
    console.error("❌ findNewsByLang Error:", err.message);
    return [];
  }
};

// 🔁 Dedup check
export const checkNewsExists = async (link: string) => {
  try {
    const { data, error } = await supabase
      .from("news_articles")
      .select("id")
      .eq("link", link)
      .maybeSingle();

    if (error) return false;

    return !!data;
  } catch (err) {
    return false;
  }
};

// 🗄️ Insert news
export const insertNews = async (news: any) => {
  try {
    const { error } = await supabase
      .from("news_articles")
      .insert(news);

    if (error) {
      console.error("❌ Insert Error:", error.message);
    }
  } catch (err: any) {
    console.error("❌ Insert Catch Error:", err.message);
  }
};