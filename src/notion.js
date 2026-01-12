import express from "express";

const router = express.Router();

// @RequestMapping("/notion")
router.get("/", async (req, res) => {
    try {
        const pageSize = Math.min(Number(req.query.pageSize ?? 10), 100);
        const cursor = req.query.cursor?.toString();

        const body = {
            page_size: pageSize,
            filter: { property: "object", value: "page" },
            sort: { timestamp: "last_edited_time", direction: "descending" },
            ...(cursor ? { start_cursor: cursor } : {}),
        };

        const notionRes = await fetch("https://api.notion.com/v1/search", {
            method: "POST",
            headers: notionHeaders(),
            body: JSON.stringify(body),
        });

        if (!notionRes.ok) {
            return res.status(notionRes.status).send(await notionRes.text());
        }

        const data = await notionRes.json();

        const pages = data.results.map((p) => ({
            id: p.id,
            url: p.url,
            last_edited_time: p.last_edited_time,
            created_time: p.created_time,
            properties: p.properties,
        }));

        res.json({
            results: pages,
            has_more: data.has_more,
            next_cursor: data.next_cursor,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message ?? "Failed to fetch Notion pages" });
    }
});

export default router;

function notionHeaders() {
    const token = process.env.NOTION_API_KEY;
    if (!token) throw new Error("Missing NOTION_API_KEY in .env");

    return {
        Authorization: `Bearer ${token}`,
        "Notion-Version": process.env.NOTION_VERSION ?? "2025-09-03",
        "Content-Type": "application/json",
    };
}