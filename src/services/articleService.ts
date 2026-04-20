import axios from "axios";
import * as cheerio from "cheerio";

export const getFullArticle = async (url: string): Promise<string> => {
  try {
    const { data } = await axios.get(url, {
      timeout: 15000,
      headers: {
        // 🔥 Latest real-user headers
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "hi-IN,hi;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": "https://www.google.com/",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1"
      },
    });

    const $ = cheerio.load(data);

    // 🧹 Cleanup
    $("script, style, nav, footer, header, aside, .sidebar, .ads, .comment, .promo, .social-share").remove();

    // 🎯 Specialized Aaj Tak Selector
    const selectors = [
      "div.story-with-main-sec p", 
      "div.at_storybody p",
      "article p",
      ".article-body p",
      ".content-inner p"
    ];

    let contentArr: string[] = [];

    for (const selector of selectors) {
      $(selector).each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 50 && !text.includes("Copyright") && !text.includes("ये भी पढ़ें")) {
          contentArr.push(text);
        }
      });
      if (contentArr.length > 3) break;
    }

    // Fallback if selectors fail
    if (contentArr.length === 0) {
      $("p").each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 80) contentArr.push(text);
      });
    }

    const finalContent = Array.from(new Set(contentArr)).join("\n\n");

    if (!finalContent || finalContent.length < 150) {
        return ""; // Khali string bhejo taaki Android button dikhaye
    }

    return finalContent.slice(0, 3500);

  } catch (err: any) {
    console.error("❌ Scraper Error:", err.message);
    return ""; // Error pe bhi khali string
  }
};