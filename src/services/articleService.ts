import axios from "axios";
import * as cheerio from "cheerio";

export const getFullArticle = async (url: string): Promise<string> => {
  try {
    const { data } = await axios.get(url, {
      timeout: 8000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Referer": "https://www.google.com/", // 🔥 anti-block
      },
    });

    const $ = cheerio.load(data);

    // 🔥 1. Remove garbage elements
    $(
      "script, style, nav, footer, header, aside, iframe, noscript, .sidebar, .ads, .advertisement, .comment, .related, .promo"
    ).remove();

    // 🔥 2. Strong selectors (priority based)
    const selectors = [
      "article p",
      '[itemprop="articleBody"] p',
      ".article-body p",
      ".story-content p",
      ".content-inner p",
      ".post-content p",
      ".entry-content p",
      "#article-body p",
    ];

    let contentArr: string[] = [];

    for (const selector of selectors) {
      $(selector).each((_, el) => {
        const text = $(el).text().trim();

        // 🔥 strict filter
        if (
          text.length > 40 &&
          !text.toLowerCase().includes("read more") &&
          !text.toLowerCase().includes("click here")
        ) {
          contentArr.push(text);
        }
      });

      if (contentArr.length > 5) break; // enough content मिला
    }

    // 🔥 3. Smart fallback (controlled)
    if (contentArr.length === 0) {
      $("p").each((_, el) => {
        const text = $(el).text().trim();

        if (
          text.length > 80 &&
          !text.toLowerCase().includes("privacy policy") &&
          !text.toLowerCase().includes("advertisement")
        ) {
          contentArr.push(text);
        }
      });
    }

    // 🔥 4. Remove duplicates (IMPORTANT)
    const uniqueContent = Array.from(new Set(contentArr));

    // 🔥 5. Final clean output
    let finalContent = uniqueContent.join("\n\n");

    return finalContent.slice(0, 3500);
  } catch (err: any) {
    console.error("❌ Article Fetch Error:", err.message);
    return "";
  }
};