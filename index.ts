import express from "express";
import path from "path";

const app = express();

app.use("/assets", express.static("assets"));

app.get("/", (req, res) => {
    res.sendFile(path.resolve("./assets/index.html"));
})

app.get("/bundle.js", (req, res) => {
    res.sendFile(path.resolve("./dist/bundle.js"));
})

app.listen(3002, () => {
    console.log("Listening on port 3002");
});
