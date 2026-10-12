import * as dotenv from "dotenv";

dotenv.config({ path: process.cwd() + "/.env" });

export const FFMPEG_PATH = process.env.FFMPEG_PATH;
export const FFPROBE_PATH = process.env.FFPROBE_PATH;
export const DB_FILE = process.env.DB_FILE ?? "db.json";
export const DIRECTORY = process.env.DIRECTORY ?? "videos";
export const PORT = Number(process.env.PORT) || 3000;
