import axios from "axios";

export const processContent = async (text: string, lang: string) => {
  try {
    const res = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini", // Sasta aur fast model, perfect hai
        messages: [
          {
            role: "system",
            content: `You are a professional news editor. 
            Tasks:
            1. Summarize the news in exactly 80-100 words.
            2. Language: Must be in ${lang}.
            3. Tone: Informative and engaging.
            4. Completion: Ensure the last sentence is full and complete. Do not cut off in the middle.
            5. Content: Do not include any HTML tags or links.`,
          },
          {
            role: "user",
            content: text,
          },
        ],
        max_tokens: 300, // Taaki summary puri aaye aur beech mein na kate
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    return res.data.choices[0].message.content.trim();
  } catch (error) {
    console.error("AI Service Error:", error);
    // Fallback: Agar AI fail ho jaye toh kam se kam text toh dikhe
    return text.length > 160 ? text.slice(0, 157) + "..." : text;
  }
};