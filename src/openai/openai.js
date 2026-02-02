import OpenAI from "openai";
import express from "express";

const router = express.Router();
const client = new OpenAI({apiKey: process.env.OPENAI_API_KEY});

// @RequestMapping("/api/openai")
router.get("/", async (req, res) => {
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

router.get("/summary", async (req, res) => {

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
    *
    *
    * */

});

export default router;