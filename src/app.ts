import express from "express";
import newsRoutes from "./routes/newsRoutes";
import { errorHandler } from "./middleware/errorHandler";
import articleRoutes from "./routes/articleRoutes";

const app = express();

app.use(express.json());

app.use("/api/news", newsRoutes);

app.use(errorHandler);
app.use("/article", articleRoutes);

export default app;

app.get("/", (req, res) => {
  res.send("🚀 Yashora News API is running smoothly!");
});