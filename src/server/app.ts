import express, { urlencoded } from "express";
import { errorHandler, notFound } from "./http";
import { log } from "./log";
import { updateDatabase } from "./scan";
import { router as count } from "./routes/count";
import { router as stream } from "./routes/stream";
import { router as tags } from "./routes/tags";
import { router as videos } from "./routes/videos";

const api = express.Router();
api.use(express.json());
api.use(urlencoded({ extended: false }));
api.use(videos, stream, count, tags);
// unknown /api paths get a JSON 404 instead of reaching the client routes
api.use(notFound);
api.use(errorHandler);

/**
 * the API, mounted at /api. main.ts adds the client files for production;
 * in dev, express-plugin.ts mounts this into the vite dev server.
 */
export const app = express();
app.use("/api", api);

/**
 * starts the uptime ticker and the database scan.
 * returns a function that stops them, used by the vite dev plugin when it
 * reloads this module.
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
            const secs = String(Math.floor(uptime / 1000) % 60).padStart(2, "0");
            const mins = String(Math.floor(uptime / 60000) % 60).padStart(2, "0");
            const hours = String(Math.floor(uptime / 3600000)).padStart(2, "0");
            process.stdout.write(`uptime: ${hours}:${mins}:${secs}\t`);
        }, 1000);
        intervals.push(ticker);
    }
    updateDatabase();
    intervals.push(setInterval(updateDatabase, 60000));
    return () => intervals.forEach(clearInterval);
};
