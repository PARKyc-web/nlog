import OpenAI from "openai";

const model = "gpt-5-nano";
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

function chkPrompt(prompt){
    // null/undefined 체크
    if (prompt == null) {
        throw new TypeError("prompt is required");
    }

    // 타입 체크
    if (typeof prompt !== "string") {
        throw new TypeError("prompt must be a string");
    }

    // 빈값/공백만 체크
    if (prompt.trim().length === 0) {
        throw new RangeError("prompt must not be empty");
    }
}

async function getPromptText(prompt){
    const response = {status: 200, statusText: "200 OK", data : ""};
    try{
        chkPrompt(prompt);
        const promptRes = await client.responses.create({
            model: model,
            input: prompt,
        });

        response.data = promptRes.output_text;
    } catch (error){
        console.error(error);

        // 입력 검증 에러면 400으로 처리하고 싶으면:
        if (error instanceof TypeError || error instanceof RangeError) {
            response.status = 400;
            response.statusText = "400 Bad Request";
            response.data = error.message;
        } else {
            response.status = 500;
            response.statusText = "500 Server Error"
            response.data = error?.message ?? String(error);
        }
    }

    return response;
}


export default {
    getPromptText,
}