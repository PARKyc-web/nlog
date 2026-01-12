import "dotenv/config";
import express from "express";

import notionAPI from "./src/notion.js";
import githubAPI from "./src/github.js";
import openaiAPI from "./src/openai.js";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.get("/", (req, res) => {
    res.send("Hello Express!");
});

app.use("/openai", openaiAPI);
app.use("/github", githubAPI);
app.use("/notion", notionAPI);

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));