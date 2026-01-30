import express from "express";

import github_routes from "./github/github.js";
import openai_routes from "./openai/openai.js";
import notion_routes from "./notion/notion.js";
import page_routes from "./page_routes.js"

const router = express.Router();

router.use("/api/github", github_routes);
router.use("/api/openai", openai_routes);
router.use("/api/notion", notion_routes);
router.use("/", page_routes);

export default router;