import axios from "axios";
import * as cheerio from "cheerio";

export const getFullArticle = async (url: string): Promise<string> => {
  try {
    const { data } = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.google.com/",
      },
    });

    const $ = cheerio.load(data);

    // 🧹 Clean junk
    $("script, style, nav, footer, header, aside, iframe, noscript").remove();

    const selectors = [
      "article p",
      '[itemprop="articleBody"] p',
      ".article-body p",
      ".story-content p",
      ".content-inner p",
      ".post-content p",
    ];

    let contentArr: string[] = [];

    for (const selector of selectors) {
      $(selector).each((_, el) => {
        const text = $(el).text().trim();

        if (
          text.length > 60 &&
          !text.toLowerCase().includes("read more") &&
          !text.toLowerCase().includes("advertisement")
        ) {
          contentArr.push(text);
        }
      });

      if (contentArr.length > 5) break;
    }

    // 🔥 Fallback
    if (contentArr.length === 0) {
      $("p").each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 80) contentArr.push(text);
      });
    }

    const unique = Array.from(new Set(contentArr));
    const finalText = unique.join("\n\n").slice(0, 3000);

    // 🚨 अगर useless content है → skip
    if (finalText.length < 200) {
      return "";
    }

    return finalText;

  } catch (err: any) {
    console.log("❌ Scraper Blocked:", err.message);
    return ""; // 🔥 IMPORTANT: error text return मत करो
  }
};