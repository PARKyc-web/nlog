import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");

const goPage = (page_path) => {
    return path.join(ROOT, "views", page_path);
}

router.get("/", (req, res) => {
    res.send("Hello Express!");
});

/* github page controller */
router.get("/repo", (req, res) => {
    const page = goPage("github/repo.html");

    res.sendFile(page);
});
router.get("/commit", async (req, res) => {
    const page = goPage("github/commit.html");

    res.sendFile(page);
})

export default router;
