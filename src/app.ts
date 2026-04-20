import express from "express";
import newsRoutes from "./routes/newsRoutes";
import { errorHandler } from "./middleware/errorHandler";
import articleRoutes from "./routes/articleRoutes";
import podcastRoutes from "./routes/podcastRoutes";

const app = express();

app.use(express.json());

app.use("/api/news", newsRoutes);

app.use(errorHandler);
app.use("/article", articleRoutes);
app.use("/api", podcastRoutes);

export default app;

app.get("/", (req, res) => {
  res.send("🚀 Yashora News API is running smoothly!");
});