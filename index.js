import "dotenv/config";
import express from "express";
import OpenAI from "openai";

const app = express();

const PORT = Number(process.env.PORT ?? 3000);
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get("/", (req, res) => res.send("Hello Express!"));

app.get("/openai", async (req, res) => {
  try {
    const response = await client.responses.create({
      model: "gpt-5-nano",
      input: "Write a one-sentence bedtime story about a unicorn.",
    });

    res.send(response.output_text);
  } catch (err) {
    console.error(err);
    res.status(500).send("OpenAI request failed. Check server logs and OPENAI_API_KEY.");
  }
});

app.get("/github", async (req, res) => {
    try {
        const per_page = Math.min(Number(req.query.per_page ?? 30), 100);
        const page = Math.max(Number(req.query.page ?? 1), 1);
        const affiliation = (req.query.affiliation ?? "owner").toString();
        // owner | collaborator | organization_member  (콤마로 여러개 가능)

        const url = new URL("https://api.github.com/user/repos");
        url.searchParams.set("per_page", String(per_page));
        url.searchParams.set("page", String(page));
        url.searchParams.set("sort", "updated");
        url.searchParams.set("direction", "desc");
        url.searchParams.set("affiliation", affiliation);

        const ghRes = await fetch(url, { headers: githubHeaders() });

        if (!ghRes.ok) {
            return res.status(ghRes.status).send(await ghRes.text());
        }

        const repos = await ghRes.json();

        res.json(
            repos.map((r) => ({
                name: r.name,
                full_name: r.full_name,
                private: r.private,
                html_url: r.html_url,
                default_branch: r.default_branch,
                updated_at: r.updated_at,
                language: r.language,
            }))
        );
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message ?? "Failed to fetch repos" });
    }
});

app.get("/notion", async (req, res) => {
    try {
        const pageSize = Math.min(Number(req.query.pageSize ?? 10), 100);
        const cursor = req.query.cursor?.toString(); // 다음 페이지용 next_cursor

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

        // title은 페이지마다 구조가 조금 달라서, 우선 id/url/last_edited_time 위주로 내려줌
        const pages = data.results.map((p) => ({
            id: p.id,
            url: p.url,
            last_edited_time: p.last_edited_time,
            created_time: p.created_time,
            // 필요하면 properties에서 제목 파싱 로직을 추가할 수 있음
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



app.listen(PORT, () => console.log(`http://localhost:${PORT}`));

function githubHeaders() {
    const token = process.env.GIT_API_KEY;
    if (!token) throw new Error("Missing GIT_API_KEY in .env");

    return {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        Authorization: `Bearer ${token}`,
    };
}

function notionHeaders() {
    const token = process.env.NOTION_API_KEY;
    if (!token) throw new Error("Missing NOTION_API_KEY in .env");

    return {
        Authorization: `Bearer ${token}`,
        "Notion-Version": process.env.NOTION_VERSION ?? "2025-09-03",
        "Content-Type": "application/json",
    };
}