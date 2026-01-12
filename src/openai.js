import OpenAI from "openai";
import express from "express";

const router = express.Router();
const client = new OpenAI({apiKey: process.env.OPENAI_API_KEY});

// @RequestMapping("/openai")
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

export default router;