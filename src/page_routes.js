import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");

router.get("/", (req, res) => {
    res.send("Hello Express!");
});

/* github page controller */
router.get("/github/repo", (req, res) => {
    res.sendFile(path.join(ROOT, "views", "github", "repo.html"));
});

export default router;
