import express from "express";

const router = express.Router();

const pageSize = 100;

const DATABASE_URL = "https://api.notion.com/v1/database/";
const DATASOURCE_URL = "https://api.notion.com/v1/data_sources/";

// @RequestMapping("/notion")
router.get("/", async (req, res) => {
    try {
        const cursor = req.query.cursor?.toString();

        const body = {
            page_size: pageSize,
            // filter: { property: "object", value: "page" },
            sort: { timestamp: "last_edited_time", direction: "descending" },
            // ...(cursor ? { start_cursor: cursor } : {}),
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
        res.json(data);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message ?? "Failed to fetch Notion pages" });
    }
});

router.get("/data-source", async (req, res) => {
    try {
        const cursor = req.query.cursor?.toString();

        const body = {
            page_size: pageSize,
            filter: { property: "object", value: 'data_source' },
            sort: { timestamp: "last_edited_time", direction: "descending" },
            // ...(cursor ? { start_cursor: cursor } : {}),
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
        const dataMap = data.results.filter(d => d.database_parent.type === 'workspace')
            .map(d => ({
                id: d.id,
                database: d.parent.database_id,
                title: d.title[0].plain_text,
                properties: d.properties,
            }));

        res.render("notion/data-source", {"dataSources":dataMap});

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message ?? "Failed to fetch Notion pages" });
    }
});

router.get("/db/:id", async (req, res) => {
    try {
        const pageId = req.params.id;

        const notionRes = await fetch(`https://api.notion.com/v1/databases/${pageId}`, {
            method: "GET",
            headers: notionHeaders(),
        });

        if (!notionRes.ok) {
            return res.status(notionRes.status).send(await notionRes.text());
        }

        const page = await notionRes.json();

        res.json(page);
    } catch (e) {
        res.status(500).json({ message: "server error", error: String(e) });
    }
});

router.get("/ds/:id", async (req, res) => {
    try {
        const pageId = req.params.id;

        const notionRes = await fetch(`https://api.notion.com/v1/data_sources/${pageId}`, {
            method: "GET",
            headers: notionHeaders(),
        });

        if (!notionRes.ok) {
            return res.status(notionRes.status).send(await notionRes.text());
        }

        const page = await notionRes.json();

        res.json(page);
    } catch (e) {
        res.status(500).json({ message: "server error", error: String(e) });
    }
});

router.get("/page/:id", async (req, res) => {

    const datasourceId = req.params.id;
    const pRes = await fetch(`${DATASOURCE_URL}${datasourceId}`, {
        method: "GET",
        headers: notionHeaders(),
    });

    if(!pRes.ok){
        return res.status(pRes.status).send(await pRes.text());
    }

    const properties = await pRes.json();
    console.log(properties);
    const data = {
        database_id: properties.parent.database_id,
        datasource_id: properties.id,
        properties: properties.properties,
    };
    // res.send(data);
    res.render("notion/form", data);
});



router.get("/add-page", async (req, res) =>{

    const databaseId = req.query.id;

    const body = {
        parent: {type: 'data_source_id', data_source_id: databaseId},
        properties: {
            '회의 이름':{ // 각 데이터베이스의 컬럼을 조회하는 부분이 있어야 함.
                title: [{text: {content: 'nlog APi 글 등록'}}]
            }
        }
    }

    const notionRes = await fetch("https://api.notion.com/v1/pages", {
        method: 'POST',
        headers: notionHeaders(),
        body: JSON.stringify(body)
    });

    if (!notionRes.ok) {
        return res.status(notionRes.status).send(await notionRes.text());
    }

    const created = await notionRes.json();
    return res.json(created);
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