import { Router } from "express";
import { getNewsController } from "../controllers/newsController";

const router = Router();

router.get("/", getNewsController);

export default router;