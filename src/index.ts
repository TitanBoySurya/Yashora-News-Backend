import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { runNewsJob } from "./jobs/newsJob";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});

// हर 10 मिनट में auto run
setInterval(runNewsJob, 10 * 60 * 1000);