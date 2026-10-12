import express, { urlencoded } from "express";
import { requirePassword, sameOriginWrites } from "./access";
import { PASSWORD } from "./config";
import { clearThumbnailQueue } from "./ffmpeg";
import { errorHandler, notFound } from "./http";
import { log } from "./log";
import { startScanning } from "./scan";
import { router as count } from "./routes/count";
import { router as stream } from "./routes/stream";
import { router as tags } from "./routes/tags";
import { router as videos } from "./routes/videos";

const api = express.Router();
api.use(sameOriginWrites);
api.use(express.json());
api.use(urlencoded({ extended: false }));
// express 5 leaves req.body undefined when no parser ran (e.g. a request
// without a body), and the routes read their fields from it
api.use((req, _res, next) => {
    req.body ??= {};
    next();
});
api.use(videos, stream, count, tags);
// unknown /api paths get a JSON 404 instead of reaching the client routes
api.use(notFound);
api.use(errorHandler);

/**
 * the API, mounted at /api. main.ts adds the client files for production;
 * in dev, express-plugin.ts mounts this into the vite dev server.
 */
export const app = express();
// before everything else, so the client files are protected too
if (PASSWORD) app.use(requirePassword(PASSWORD));
app.use("/api", api);

/**
 * starts the uptime ticker and the database scan.
 * returns a function that stops them and drops queued thumbnails, used by
 * the vite dev plugin when it reloads this module.
 */
export const start = () => {
    log.info("server started");
    const intervals: NodeJS.Timeout[] = [];
    const startTime = new Date().getTime();
    // show uptime in hh:mm:ss and update every second by clearing the line.
    // only on a terminal: clearLine and cursorTo don't exist when piped
    if (process.stdout.isTTY) {
        const ticker = setInterval(() => {
            const currentTime = Date.now();
            const uptime = currentTime - startTime;
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
            const pad = (n: number) => String(n).padStart(2, "0");
            const secs = pad(Math.floor(uptime / 1000) % 60);
            const mins = pad(Math.floor(uptime / 60000) % 60);
            const hours = pad(Math.floor(uptime / 3600000));
            process.stdout.write(`uptime: ${hours}:${mins}:${secs}\t`);
        }, 1000);
        intervals.push(ticker);
    }
    const stopScanning = startScanning();
    return () => {
        intervals.forEach(clearInterval);
        stopScanning();
        clearThumbnailQueue();
    };
};
