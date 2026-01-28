import express from "express";

import github_routes from "./github/github.js";
import openai_routes from "./openai/openai.js";
import notion_routes from "./notion/notion.js";

const router = express.Router();

router.get("/", (req, res) => {
    res.send("Hello Express!");
});

router.use("/github", github_routes);
router.use("/openai", openai_routes);
router.use("/notion", notion_routes);

export default router;