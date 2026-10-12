/**
 * production entry point (npm start): serves the built client from dist/ and
 * the API. in dev, express-plugin.ts loads app.ts instead.
 */
import express from "express";
import * as path from "path";
import { app, start } from "./app";
import { PORT } from "./config";
import { log } from "./log";

const frontendFiles = path.join(process.cwd(), "dist");
app.use(express.static(frontendFiles));
app.get("/*", (_, res) => {
    res.sendFile(path.join(frontendFiles, "index.html"));
});
app.listen(PORT, () => {
    log.info(`listening on http://localhost:${PORT}`);
});
start();
