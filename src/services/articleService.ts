import axios from "axios";
import * as cheerio from "cheerio";

/**
 * 🔥 Pro News Scraper (Cheap & Fast)
 * No AI used. Optimized for Indian News Sites like Aaj Tak, NDTV, Zee News.
 */
export const getFullArticle = async (url: string): Promise<string> => {
  try {
    const { data } = await axios.get(url, {
      timeout: 12000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "hi-IN,hi;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": "https://www.google.com/",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      },
    });

    const $ = cheerio.load(data);

    // 1. 🧹 Unwanted elements ko remove karein (Cleanup)
    $(
      "script, style, nav, footer, header, aside, iframe, noscript, .sidebar, .ads, .advertisement, .comment, .related, .promo, .social-share, .tags, .author-profile"
    ).remove();

    // 2. 🎯 Priority Selectors (Hindi News Sites Specialized)
    const selectors = [
      ".story-with-main-sec p",   // Aaj Tak
      ".at_storybody p",          // Navbharat Times
      ".story-section p",         // Zee News
      ".article-body p",          // General
      ".content-inner p",         // NDTV
      ".story-content p",         // Inshorts source sites
      '[itemprop="articleBody"] p',
      "article p",
      ".post-content p"
    ];

    let contentArr: string[] = [];

    for (const selector of selectors) {
      $(selector).each((_, el) => {
        let text = $(el).text().trim();

        // Entity Cleanup
        text = text
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'")
          .replace(/\s+/g, ' '); // Extra spaces hatao

        // Filter: Sirf kaam ka content (Hindi characters allow kiye hain)
        if (
          text.length > 50 && 
          !text.includes("ये भी पढ़ें") && 
          !text.includes("ये भी पढ़ें") &&
          !text.includes("Copyright") &&
          !text.toLowerCase().includes("subscribe")
        ) {
          contentArr.push(text);
        }
      });

      // Agar content mil gaya toh loop break karein (Performance)
      if (contentArr.length > 4) break;
    }

    // 3. 🛡️ Smart Fallback (Agar specialized selectors fail ho jayein)
    if (contentArr.length === 0) {
      $("div p, section p").each((_, el) => {
        let text = $(el).text().trim();
        if (text.length > 70 && !text.toLowerCase().includes("privacy policy")) {
          contentArr.push(text);
        }
      });
    }

    // 4. ✨ Duplicate lines remove karein
    const uniqueContent = Array.from(new Set(contentArr));
    let finalContent = uniqueContent.join("\n\n");

    // 5. 🚨 Empty Response Handling
    if (!finalContent || finalContent.length < 150) {
      // Inshorts style fallback message
      return `⚠️ विस्तृत जानकारी अभी उपलब्ध नहीं है।\n\nपूरी खबर पढ़ने के लिए नीचे दिए गए बटन या लिंक का उपयोग करें।\n\n🔗 ओरिजिनल सोर्स:\n${url}`;
    }

    // 6. Final Clean & Slice
    return finalContent.trim().slice(0, 4000);

  } catch (err: any) {
    console.error("❌ Scraper Error:", err.message);
    return `⚠️ नेटवर्क समस्या के कारण खबर लोड नहीं हो पाई।\n\nकृपया अपना इंटरनेट चेक करें या सीधे लिंक से पढ़ें।\n\n🔗 लिंक:\n${url}`;
  }
};