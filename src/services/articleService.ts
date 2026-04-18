import axios from "axios";
import * as cheerio from "cheerio";

export const getFullArticle = async (url: string): Promise<string> => {
  try {
    const { data } = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.google.com/",
        "Connection": "keep-alive",
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
        let text = $(el).text().trim();

        // 🔥 Clean HTML entities
        text = text
          .replace(/&#039;/g, "'")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/&nbsp;/g, " ");

        // 🔥 strict filter
        if (
          text.length > 40 &&
          !text.toLowerCase().includes("read more") &&
          !text.toLowerCase().includes("click here") &&
          !text.toLowerCase().includes("advertisement")
        ) {
          contentArr.push(text);
        }
      });

      if (contentArr.length > 5) break;
    }

    // 🔥 3. Smart fallback (controlled)
    if (contentArr.length === 0) {
      $("p").each((_, el) => {
        let text = $(el).text().trim();

        text = text
          .replace(/&#039;/g, "'")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/&nbsp;/g, " ");

        if (
          text.length > 80 &&
          !text.toLowerCase().includes("privacy policy") &&
          !text.toLowerCase().includes("advertisement")
        ) {
          contentArr.push(text);
        }
      });
    }

    // 🔥 4. Remove duplicates
    const uniqueContent = Array.from(new Set(contentArr));

    let finalContent = uniqueContent.join("\n\n");

    // 🔥 5. 🚨 IMPORTANT: Empty / blocked site fallback
    if (!finalContent || finalContent.length < 120) {
      return `⚠️ Full article load नहीं हो पाया।

👉 यह वेबसाइट content block कर रही है।

🔗 पूरा पढ़ने के लिए नीचे link खोलें:
${url}`;
    }

    // 🔥 6. Final trim
    return finalContent.slice(0, 3500);

  } catch (err: any) {
    console.error("❌ Article Fetch Error:", err.message);

    return `⚠️ Article fetch नहीं हो पाया।

👉 Internet issue या website block कर रही है।

🔗 Direct link खोलें:
${url}`;
  }
};