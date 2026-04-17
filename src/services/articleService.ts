import axios from "axios";
import * as cheerio from "cheerio";

// 🔥 Clean article extractor (NO AI, pure original content)
export const getFullArticle = async (url: string) => {
  try {
    const { data } = await axios.get(url, {
      timeout: 5000,
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const $ = cheerio.load(data);

    // 🔥 remove unwanted tags
    $("script, style, noscript, iframe, ads, header, footer").remove();

    let paragraphs: string[] = [];

    // 🔥 Try multiple selectors (important for all sites)
    const selectors = [
      "article p",
      ".story p",
      ".content p",
      ".article p",
      ".post-content p",
      ".entry-content p",
      ".td-post-content p",
      ".story__content p",
    ];

    for (const selector of selectors) {
      const found = $(selector);
      if (found.length > 5) {
        found.each((_, el) => {
          const text = $(el).text().trim();
          if (text.length > 50) {
            paragraphs.push(text);
          }
        });

        if (paragraphs.length > 0) break;
      }
    }

    // 🔥 fallback (अगर structure अलग हो)
    if (paragraphs.length === 0) {
      $("p").each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 80) {
          paragraphs.push(text);
        }
      });
    }

    return {
      content: paragraphs.join("\n\n"), // scrollable text
    };

  } catch (error) {
    console.error("Article Fetch Error:", error);
    return {
      content: "Content not available",
    };
  }
};