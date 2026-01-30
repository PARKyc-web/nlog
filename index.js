import "dotenv/config";
import express from "express";

import routes from "./src/routes.js";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.set("view engine", "ejs");

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use("/", routes);

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));