import { processNewsService } from "../services/newsService";

const langs = ["hi", "en", "ta", "te", "bn", "mr"];

export const runNewsJob = async () => {
  for (const lang of langs) {
    await processNewsService(lang);
  }
};