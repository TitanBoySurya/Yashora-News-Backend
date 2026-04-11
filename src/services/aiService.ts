import axios from "axios";

export const processContent = async (
  text: string,
  lang: string
) => {
  try {
    const res = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Summarize in 100 words and translate to ${lang}`,
          },
          {
            role: "user",
            content: text,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    return res.data.choices[0].message.content;
  } catch {
    return text.slice(0, 150);
  }
};