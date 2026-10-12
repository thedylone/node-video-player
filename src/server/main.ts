/**
 * production entry point (npm start): serves the built client from dist/ and
 * the API. in dev, express-plugin.ts loads app.ts instead.
 */
import express from "express";
import * as path from "path";
import { isLoopback, localHostsOnly } from "./access";
import { app, start } from "./app";
import { ALLOWED_HOSTS, HOST, PASSWORD, PORT } from "./config";
import { log } from "./log";

const server = express();
// when only this machine can connect, only names for this machine are valid
// (in dev, vite checks the Host header itself)
if (isLoopback(HOST)) server.use(localHostsOnly(ALLOWED_HOSTS));
server.use(app);
const frontendFiles = path.join(process.cwd(), "dist");
server.use(express.static(frontendFiles));
// client routes such as /watch/<id> get the app, which routes them itself
server.get("/{*path}", (_, res) => {
    res.sendFile(path.join(frontendFiles, "index.html"));
});
server.listen(PORT, HOST, (error) => {
    // e.g. the port is in use. express 5 passes the error here instead of
    // crashing, so stop rather than keep scanning without serving
    if (error) {
        log.error(`can't listen on ${HOST} port ${PORT}`, error);
        process.exit(1);
    }
    const anywhere = HOST === "0.0.0.0" || HOST === "::";
    const host = anywhere
        ? "localhost"
        : HOST.includes(":")
          ? `[${HOST}]`
          : HOST;
    log.info(`listening on http://${host}:${PORT}`);
    if (!isLoopback(HOST) && !PASSWORD) {
        log.info(
            "other machines can connect and PASSWORD is not set: anyone " +
                "who can reach this port can delete videos"
        );
    }
});
start();
