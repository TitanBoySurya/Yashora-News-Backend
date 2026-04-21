import { supabase } from "../config/supabase";

export const findPodcastsByCategory = async (category: string) => {
  try {
    const { data, error } = await supabase
      .from("podcasts") // Jo SQL table humne abhi banayi
      .select("*")
      .eq("category", category)
      .eq("is_active", true) // Sirf active podcasts dikhao
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    throw err;
  }
};