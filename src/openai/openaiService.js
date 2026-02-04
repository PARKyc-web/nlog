import client from "./openaiClient.js";

async function summaryRepo(url){
    const result = await client.getPromptText(`${url}의 Repository 앞으로 Commit을 요약하는데 사용할 수 있도록 프로젝트 전체를 요약해서 txt파일을 만들어줘`);

    console.log("summaryRepo", result);
    return result.data;
}

export default {
    summaryRepo,
}