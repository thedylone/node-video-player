/**
 * production entry point (npm start): serves the built client from dist/ and
 * the API. in dev, express-plugin.ts loads app.ts instead.
 */
import express from "express";
import * as path from "path";
import { app, start } from "./app";
import { PORT } from "./config";

const frontendFiles = path.join(process.cwd(), "dist");
app.use(express.static(frontendFiles));
app.get("/*", (_, res) => {
    res.sendFile(path.join(frontendFiles, "index.html"));
});
app.listen(PORT, () => {
    process.stdout.write(`listening on http://localhost:${PORT}\n`);
});
start();
