import express from "express";
import githubService from "./githubService.js";
import openaiClient from "../openai/openaiClient.js";

const router = express.Router();

const per_page = 100;
const page = 1;
const affiliation = "owner";
// owner 뿐만 아니라, collaborator에 해당하는 것도 자동으로 요약할 수 있으면 좋을 것 같음
// 일단 owner 기준으로 작업하자

const createHeaders = () => {
    const token = process.env.GIT_API_KEY;
    if (!token) throw new Error("Missing GIT_API_KEY in .env");``

    return {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": process.env.GIT_API_VERSION ?? "2022-11-28",
        Authorization: `Bearer ${token}`,
    };
}

const createHeadersByCommit = () => {
    const token = process.env.GIT_API_KEY;
    if (!token) throw new Error("Missing GIT_API_KEY in .env");``

    return {
        Accept: "application/vnd.github.v3.diff",
        "X-GitHub-Api-Version": process.env.GIT_API_VERSION ?? "2022-11-28",
        Authorization: `Bearer ${token}`,
    };
}

const convertTimeToUTC = (time) => {
    // 9시간을 더하는게 아닌, UTC 기준으로 KST로 작성되었다는 것을 나타냄(+09:00)
    const date = new Date(`${time}+09:00`);

    return date.toISOString();
}

// @RequestMapping("/api/github")

/** 사용자의 전체 Repo를 조회하는 API */
router.get("/repos", async (req, res) => {
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
        console.log(repos);
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

/** 사용자의 특정 1개 Repo에 대한 정보를 조회한다. */
router.get("/repo/:owner/:name", async (req, res) => {
    const owner = req.params.owner;
    const name = req.params.name;

    const url = new URL(`https://api.github.com/repos/${owner}/${name}`);

    const repoRes = await fetch(url, {headers: createHeaders()});
    const result = await repoRes.json();

    res.send(result);
});

router.get("/repo/tree", async (req, res) => {
    const response = await githubService.getRepoTree();
    res.send(response);
});

router.get("/repo/json-tree", async (req, res) => {
    const response = await githubService.getRepoJsonTree();
    res.send(response);
});

router.get("/repo/summ-test", async (req, res) => {
    const project = await githubService.getRepoJsonTree();
    const prompt = `다음은 특정 GitHub 프로젝트의 "구조 요약"을 만들기 위한 입력이다.

[입력 데이터]
- 프로젝트 구조(JSON):
${project}

-URL
이것은 https://github.com/PARKyc-web/nlog

[출력 목표]
- 이 프로젝트를 이해하기 위한 "참고용 TXT 요약"을 생성하라.
- 결과는 사람이 나중에 다시 읽기 위한 문서이며, 대화 응답이 아니다.

[출력 형식 규칙]
- 반드시 순수 텍스트(txt) 형식으로 출력할 것
- 제목과 섹션 헤더를 포함하되, 마크다운 기호(#, *, - 등)는 사용하지 말 것
- 문장은 모두 설명체/서술체로 작성할 것
- 존댓말, 질문, 제안, 대화체 표현을 사용하지 말 것

[내용 규칙]
- URL, 출처 링크, 괄호 안 참고 주소를 절대 포함하지 말 것
- "원하시면", "알려주시면", "추가로", "참고로"와 같은 사용자에게 말 거는 문장을 쓰지 말 것
- 모델 자신이나 응답 행위를 언급하지 말 것
- 파일/폴더 설명은 구조 기반으로 단정적으로 서술하되, 추정인 경우 "(추정)"으로만 표기

[포함해야 할 항목]
1. 프로젝트 개요(목적, 성격)
2. 기술 스택 요약
3. 디렉터리별 역할 설명
4. 전체 동작 흐름 요약
5. 활용 목적

[출력 제한]
- 불필요한 반복 설명 금지
- 링크·각주·출처 섹션 생성 금지
- 마지막 문장은 안내 문구 없이 내용으로 종료할 것

이 규칙을 어기지 말고 결과 텍스트만 출력하라.`
    const result = await openaiClient.getWebSearchPrompt(prompt);

    res.send(result);
});

router.get("/commit/:date", async (req, res) => {
    const url = new URL("https://api.github.com/repos/PARKyc-web/nlog/commits");
    url.searchParams.set("per_page", String(per_page));
    url.searchParams.set("page", String(page));
    url.searchParams.set("sort", "updated");
    url.searchParams.set("direction", "desc");
    url.searchParams.set("affiliation", affiliation);
    url.searchParams.set("since", convertTimeToUTC("2026-01-13T00:00:00"));
    url.searchParams.set("until", convertTimeToUTC("2026-01-13T23:59:59"));

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