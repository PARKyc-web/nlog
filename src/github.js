import express from "express";

const router = express.Router();

// @RequestMapping("/github")
router.get("/", async (req, res) => {
    try {
        const per_page = Math.min(Number(req.query.per_page ?? 30), 100);
        const page = Math.max(Number(req.query.page ?? 1), 1);
        const affiliation = (req.query.affiliation ?? "owner").toString();
        // owner 뿐만 아니라, collaborator에 해당하는 것도 자동으로 요약할 수 있으면 좋을 것 같음
        // 일단 owner 기준으로 작업하자

        const url = new URL("https://api.github.com/user/repos");
        url.searchParams.set("per_page", String(per_page));
        url.searchParams.set("page", String(page));
        url.searchParams.set("sort", "updated");
        url.searchParams.set("direction", "desc");
        url.searchParams.set("affiliation", affiliation);

        const githubRes = await fetch(url, { headers: createHeaders() });

        if (!githubRes.ok) {
            return res.status(githubRes.status).send(await githubRes.text());
        }

        const repos = await githubRes.json();

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

export default router;

function createHeaders() {
    const token = process.env.GIT_API_KEY;
    if (!token) throw new Error("Missing GIT_API_KEY in .env");``

    return {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": process.env.GIT_API_VERSION ?? "2022-11-28",
        Authorization: `Bearer ${token}`,
    };
}