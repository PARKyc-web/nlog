import express from "express";

const router = express.Router();

const pageSize = 100;

const DATABASE_URL = "https://api.notion.com/v1/database/";
const DATASOURCE_URL = "https://api.notion.com/v1/data_sources/";
const NOTION_PAGE_URL = "https://api.notion.com/v1/page";

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
    const data = {
        database_id: properties.parent.database_id,
        datasource_id: properties.id,
        properties: properties.properties,
    };
    // res.send(data);
    res.render("notion/form", data);
});

router.post("/page", async (req, res) => {

    const formData = req.body;
    console.log(formData);

    const properties = buildNotionProperties(formData.prop_type, formData.prop_value);

    console.log(properties);
    const body = {
        parent: {type: 'data_source_id', data_source_id: formData.datasource_id},
        properties,
    }

    const nRes = await fetch("https://api.notion.com/v1/pages", {
        method: 'POST',
        headers: notionHeaders(),
        body: JSON.stringify(body)
    });

    if (!nRes.ok) {
        return res.status(nRes.status).send(await nRes.text());
    }

    const created = await nRes.json();

    res.json(created);
    // res.redirect("/notion/data-source");
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

function buildNotionProperties(propType = {}, propValue = {}) {
    const out = {};

    for (const [name, type] of Object.entries(propType)) {
        const value = propValue?.[name];

        // created_by 같은 건 입력 안 받아도 되니 무시(원하면 목록 추가)
        if (type === "created_by" || type === "created_time" || type === "last_edited_time") {
            continue;
        }

        // 빈 값 처리(선택 필드는 null로 보내는 게 안전)
        const isEmpty =
            value === undefined ||
            value === null ||
            value === "" ||
            (Array.isArray(value) && value.length === 0);

        if (type === "title") {
            // title은 보통 필수라 빈 값이면 아예 안 넣거나(서버에서 에러), 기본값 넣기
            if (isEmpty) continue;
            out[name] = {
                title: [{ type: "text", text: { content: String(value) } }],
            };
            continue;
        }

        if (type === "rich_text") {
            if (isEmpty) continue;
            out[name] = {
                rich_text: [{ type: "text", text: { content: String(value) } }],
            };
            continue;
        }

        if (type === "date") {
            if (isEmpty) {
                out[name] = { date: null };
            } else {
                // value: "YYYY-MM-DD" 또는 ISO 문자열
                out[name] = { date: { start: String(value) } };
            }
            continue;
        }

        if (type === "number") {
            if (isEmpty) {
                out[name] = { number: null };
            } else {
                const n = Number(value);
                out[name] = { number: Number.isFinite(n) ? n : null };
            }
            continue;
        }

        if (type === "select") {
            if (isEmpty) {
                out[name] = { select: null };
            } else {
                out[name] = { select: { name: String(value) } };
            }
            continue;
        }

        if (type === "multi_select") {
            const arr = Array.isArray(value) ? value : (isEmpty ? [] : [value]);
            out[name] = {
                multi_select: arr.map((v) => ({ name: String(v) })),
            };
            continue;
        }

        if (type === "checkbox") {
            // HTML form에서는 "on"/"true"/"1" 등 다양하게 올 수 있음
            const bool =
                value === true ||
                value === "true" ||
                value === "on" ||
                value === "1" ||
                value === 1;
            out[name] = { checkbox: bool };
            continue;
        }

        // MVP: 나머지 타입은 일단 무시 (people, relation, files 등은 추가 구현 필요)
    }

    return out;
}
