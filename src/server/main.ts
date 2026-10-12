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
// client routes such as /watch/<id> get the app, which routes them itself
app.get("/{*path}", (_, res) => {
    res.sendFile(path.join(frontendFiles, "index.html"));
});
app.listen(PORT, (error) => {
    // e.g. the port is in use. express 5 passes the error here instead of
    // crashing, so stop rather than keep scanning without serving
    if (error) {
        log.error(`can't listen on port ${PORT}`, error);
        process.exit(1);
    }
    log.info(`listening on http://localhost:${PORT}`);
});
start();
