import express from "express";
import openaiService from "./openaiService.js";

const router = express.Router();

// @RequestMapping("/api/openai")
router.get("/", async (req, res) => {
   res.send("OpenAI Controller!! ");
});

router.get("/summary", async (req, res) => {

    // const repo = req.params.repo;
    const data = await openaiService.summaryRepo('https://github.com/PARKyc-web/nlog');

    res.send(data);
    /*
    * 1. 프로젝트를 최초 1회 요약해야 됨.
    * 2. 근데 프로젝트를 전부 요약한다.???
    *   > Context가 너무 많이 들지 않을까??
    *   > 근데 특정 파일만 요약하기에는 정확도가 너무 떨어짐...
    *
    * 2-1) 일단 프로젝트 전체를 요약한다
    *   > 그리고 요약한 부분을 기반으로 project_summary.md 파일을 하나 만들어서 다음부터 사용한다.
    *
    * 2-2) 특정 파일들만 요약한다.
    *   > 정확도가 떨어짐.. project_summary.md 파일을 만드는 것은 동일
    *
    * 문제점.
    * 1. 생각보다 요약하는데 시간이 오래걸림... 비동기로 돌리고 나중에 확인할 수 있도록 해야할듯?
    * 2. repo 요약 내용을 확인할 수 있는 페이지가 잇어야 함.
    *
    * */

});

export default router;