import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { runNewsJob } from "./jobs/newsJob";
import { syncPodcastsToDB } from "./services/syncService";

// पोर्ट को एनवायरनमेंट वेरिएबल से लें
const PORT = process.env.PORT || 3000;

/**
 * 🚀 Server Startup
 */
app.listen(PORT, async () => {
  // ऑनलाइन सर्वर के लिए क्लीन मैसेज
  console.log(`✅ Yashora Backend is LIVE on Port: ${PORT}`);

  // सर्वर शुरू होते ही डेटा लोड करना शुरू करें
  console.log("🛠️ Starting Initial Sync Jobs...");
  
  try {
    // न्यूज़ और पॉडकास्ट को एक साथ चलाएं
    await Promise.all([
        runNewsJob(),
        syncPodcastsToDB()
    ]);
    console.log("⭐ Initial Data Sync Successful!");
  } catch (err) {
    console.error("⚠️ Initial Sync Warning:", err);
  }
});

/**
 * ⏳ Automation Logic (Intervals)
 */

// 📰 News Update: हर 10 मिनट में (10 * 60 * 1000 ms)
setInterval(async () => {
  try {
    console.log("🕒 [NEWS] Updating latest news...");
    await runNewsJob();
  } catch (err) {
    console.error("❌ News Job Failed:", err);
  }
}, 10 * 60 * 1000);

// 🎧 Podcast Update: हर 1 घंटे में (60 * 60 * 1000 ms)
setInterval(async () => {
  try {
    console.log("🕒 [PODCAST] Syncing RSS feeds to Supabase...");
    await syncPodcastsToDB();
  } catch (err) {
    console.error("❌ Podcast Sync Job Failed:", err);
  }
}, 60 * 60 * 1000);