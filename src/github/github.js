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
    /* 프로젝트 구조에 대한 데이터를 정리해서 주지 않을 경우, context 용량이 늘어남
       diff는 어떻게 조절할껀데?
    *  */
    const prompt = `다음은 특정 프로젝트의 요약을 만들기 위한 입력이다.
이 프로젝트 요약은 이후 commit 및 diff 내용을 해석할 때, 변경된 파일이 어떤 기능 영역에 속하는지 판단하는 참고 맥락으로 사용된다.

[입력 데이터]
- https://github.com/PARKyc-web/nlog

[출력 목표]
- commit 및 diff 해석에 활용 가능한 참고용 TXT 요약을 생성하라
- 결과는 문서이며 대화 응답이 아니다

[출력 형식]
- 순수 텍스트(txt)만 출력
- 제목 + 섹션 헤더 포함
- 마크다운 기호 사용 금지
- 설명체/서술체로만 작성
- 존댓말, 질문, 제안, 대화체 사용 금지

[내용 범위 및 제약]
- Repository URL을 참고하여 프로젝트의 전반적인 성격과 기능 범위를 파악할 수 있다
- README나 코드의 문장을 그대로 인용하지 말 것
- 기능 설명은 고수준 기능 단위로만 작성할 것
- 구체적인 구현 방식, 알고리즘, 내부 처리 순서, 데이터 구조에 대한 서술은 금지한다
- 파일명과 디렉터리 구조로부터 합리적으로 도출 가능한 기능 추론은 허용한다
- 추론이 포함된 문장은 반드시 “(구조 기반 추정)”으로 명시한다
- URL 인용 문장 작성 금지

[중복 방지 규칙: 매우 중요]
- 같은 내용을 다른 섹션에서 반복하지 말 것
- 각 섹션은 아래 역할만 수행할 것

[출력 섹션(고정)]
1.	개요
목적과 성격을 2문장 이내로만 작성
2.	기술 스택
런타임, 언어, 템플릿, 정적 리소스, 외부 연동을 키워드 나열로만 작성
3.	구조 설명
폴더별 역할만 작성
목적, 기능 설명, 활용 내용 반복 금지
4.	기능 설명
프로젝트 전반의 기능 책임 영역을 요약 작성
각 기능은 파일명 및 디렉터리 구조가 암시하는 수준에서만 서술
기능 간 흐름, 세부 동작 설명 금지

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