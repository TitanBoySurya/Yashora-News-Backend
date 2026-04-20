import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

// 🔥 MAIN FUNCTION
export const generateSummary = async (text: string): Promise<string> => {
  try {
    return await geminiSummary(text);
  } catch (e) {
    console.log("⚠️ Gemini failed → DeepSeek");

    try {
      return await deepseekSummary(text);
    } catch (e) {
      console.log("⚠️ DeepSeek failed → Grok");

      try {
        return await grokSummary(text);
      } catch (e) {
        console.log("⚠️ All failed → local fallback");
        return localSummary(text);
      }
    }
  }
};


// ================= GEMINI =================
const geminiSummary = async (text: string) => {
  const res = await axios.post(
    `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      contents: [
        {
          parts: [
            {
              text: `Summarize this news in Hindi in 5 points:\n${text}`
            }
          ]
        }
      ]
    }
  );

  return res.data.candidates[0].content.parts[0].text;
};


// ================= DEEPSEEK =================
const deepseekSummary = async (text: string) => {
  const res = await axios.post(
    "https://api.deepseek.com/v1/chat/completions",
    {
      model: "deepseek-chat",
      messages: [
        {
          role: "user",
          content: `Summarize in simple Hindi:\n${text}`
        }
      ]
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );

  return res.data.choices[0].message.content;
};


// ================= GROK (xAI) =================
const grokSummary = async (text: string) => {
  const res = await axios.post(
    "https://api.x.ai/v1/chat/completions",
    {
      model: "grok-1",
      messages: [
        {
          role: "user",
          content: `Summarize this news:\n${text}`
        }
      ]
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.GROK_API_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );

  return res.data.choices[0].message.content;
};


// ================= LOCAL FALLBACK =================
const localSummary = (text: string) => {
  const sentences = text.split(". ");
  return sentences.slice(0, 3).join(". ") + ".";
};