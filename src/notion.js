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

// Create a new Notion page under a parent page
// POST /notion/pages
// body: { parentPageId: string, title: string, content?: string, children?: NotionBlock[] }
router.post("/pages", async (req, res) => {
  try {
    const parentPageId = req.body?.parentPageId?.toString();
    const title = req.body?.title?.toString();

    if (!parentPageId) return res.status(400).json({ message: "parentPageId is required" });
    if (!title) return res.status(400).json({ message: "title is required" });

    const content = req.body?.content?.toString();
    const children = Array.isArray(req.body?.children)
      ? req.body.children
      : (content ? textToParagraphChildren(content) : undefined);

    const body = {
      parent: { page_id: parentPageId },
      properties: {
        title: {
          title: toNotionRichText(title),
        },
      },
      ...(children ? { children } : {}),
    };

    const notionRes = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: notionHeaders(),
      body: JSON.stringify(body),
    });

    if (!notionRes.ok) {
      return res.status(notionRes.status).send(await notionRes.text());
    }

    const data = await notionRes.json();
    res.status(201).json({ id: data.id, url: data.url, created_time: data.created_time });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message ?? "Failed to create Notion page" });
  }
});

// Create a new Notion page inside a data source (database)
// POST /notion/data-sources/:dataSourceId/pages
// body: { properties: object, children?: NotionBlock[] }
router.post("/data-sources/:dataSourceId/pages", async (req, res) => {
  try {
    const dataSourceId = req.params.dataSourceId;
    const properties = req.body?.properties;
    const children = Array.isArray(req.body?.children) ? req.body.children : undefined;

    if (!dataSourceId) return res.status(400).json({ message: "dataSourceId is required" });
    if (!properties || typeof properties !== "object") {
      return res.status(400).json({ message: "properties (object) is required for data source pages" });
    }

    const body = {
      parent: { type: "data_source_id", data_source_id: dataSourceId },
      properties,
      ...(children ? { children } : {}),
    };

    const notionRes = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: notionHeaders(),
      body: JSON.stringify(body),
    });

    if (!notionRes.ok) {
      return res.status(notionRes.status).send(await notionRes.text());
    }

    const data = await notionRes.json();
    res.status(201).json({ id: data.id, url: data.url, created_time: data.created_time });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message ?? "Failed to create Notion page in data source" });
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

function toNotionRichText(text) {
  const safe = (text ?? "").toString();
  return [{ type: "text", text: { content: safe } }];
}

// Turns plain text into paragraph blocks (max 100 blocks per request)
function textToParagraphChildren(content, maxBlocks = 100) {
  const lines = (content ?? "").toString().split(/\r?\n/);
  const blocks = [];

  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (!trimmed) continue;

    blocks.push({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: toNotionRichText(trimmed),
      },
    });

    if (blocks.length >= maxBlocks) break;
  }

  return blocks;
}