import * as dotenv from "dotenv";

dotenv.config({ path: process.cwd() + "/.env" });

export const FFMPEG_PATH = process.env.FFMPEG_PATH;
export const FFPROBE_PATH = process.env.FFPROBE_PATH;
export const DB_FILE = process.env.DB_FILE ?? "db.json";
export const DIRECTORY = process.env.DIRECTORY ?? "videos";
export const PORT = Number(process.env.PORT) || 3000;
/** address to listen on. loopback by default, so only this machine can connect. */
export const HOST = process.env.HOST || "127.0.0.1";
/** if set, every request needs this password (HTTP Basic, any user name). */
export const PASSWORD = process.env.PASSWORD || undefined;
/** extra host names accepted while listening on a loopback address. */
export const ALLOWED_HOSTS = (process.env.ALLOWED_HOSTS ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter((x) => x);
