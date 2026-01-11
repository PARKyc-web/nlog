import "dotenv/config";
import express from "express";
import OpenAI from "openai";

const app = express();

// Read config from environment variables
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

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));