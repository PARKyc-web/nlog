import express from "express";

const router = express.Router();

const per_page = 100;
const page = 1;
const affiliation = "owner";
// owner 뿐만 아니라, collaborator에 해당하는 것도 자동으로 요약할 수 있으면 좋을 것 같음
// 일단 owner 기준으로 작업하자

// @RequestMapping("/github")
router.get("/repo", async (req, res) => {
    try {
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
                raw: r,
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

router.get("/commit", async (req, res) => {
    const url = new URL("https://api.github.com/repos/PARKyc-web/nlog/commits");
    url.searchParams.set("per_page", String(per_page));
    url.searchParams.set("page", String(page));
    url.searchParams.set("sort", "updated");
    url.searchParams.set("direction", "desc");
    url.searchParams.set("affiliation", affiliation);
    url.searchParams.set("since", convertTimeToUTC("2026-01-13T00:00:00"));
    url.searchParams.set("until", convertTimeToUTC("2026-01-13T23:59:59"));
    // url.searchParams.set("since", "2026-01-11T00:00:01Z");
    // url.searchParams.set("until", "2026-01-14T23:59:59Z");

    const githubRes = await fetch(url, {headers : createHeaders()});
    const commits = await githubRes.json();
    // commits = list
    // for문 돌려서 추출해야하는 내용 => sha, message, commit(객체) :

    const commit_list = commits.map((r) => ({
        sha: r.sha,
        message: r.commit.message,
        author: r.commit.author.name,
        date: r.commit.author.date, // KST로 변환해줘야 함.
    }))
    // console.log(commit_list);

    const url2 = new URL("https://api.github.com/repos/PARKyc-web/nlog/commits/657fcf145f749e8b921099a5d05bb21405eda1b0");
    url2.searchParams.set("direction", "desc");
    url2.searchParams.set("affiliation", affiliation);

    const one_commit = await fetch(url2, {headers: createHeadersByCommit()});
    console.log("one_commit", one_commit);
    console.log("diff text", await one_commit.text());
    // 커밋의 변경사항을 전부 출력한다....
    // 파일별로 정리할 필요가 있을거 같음..

    res.send(commit_list);
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

function createHeadersByCommit() {
    const token = process.env.GIT_API_KEY;
    if (!token) throw new Error("Missing GIT_API_KEY in .env");``

    return {
        Accept: "application/vnd.github.v3.diff",
        "X-GitHub-Api-Version": process.env.GIT_API_VERSION ?? "2022-11-28",
        Authorization: `Bearer ${token}`,
    };
}

function convertTimeToUTC(time){
    // 9시간을 더하는게 아닌, UTC 기준으로 KST로 작성되었다는 것을 나타냄(+09:00)
    const date = new Date(`${time}+09:00`);

    return date.toISOString();
}