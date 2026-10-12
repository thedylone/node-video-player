import FFmpeg from "fluent-ffmpeg";
import { DIRECTORY, FFMPEG_PATH, FFPROBE_PATH } from "./config";
import { log } from "./log";

export let ffmpegExists = false;
if (!FFMPEG_PATH || !FFPROBE_PATH) {
    log.info("ffmpeg path not found: thumbnails not generated");
} else {
    FFmpeg.setFfmpegPath(FFMPEG_PATH);
    FFmpeg.setFfprobePath(FFPROBE_PATH);
    ffmpegExists = true;
}

/** seconds before a stuck ffmpeg is killed, so it can't block the queue. */
const TIMEOUT = 120;
/** wait before retrying a failed video, doubled after each failure. */
const RETRY_FIRST = 5 * 60 * 1000;
const RETRY_MAX = 24 * 60 * 60 * 1000;

/** saves tn.png in the title folder from the middle of the video. */
const generateThumbnail = (source: string, title: string, vid: string) =>
    new Promise<void>((resolve, reject) => {
        const videoPath = [DIRECTORY, source, title, vid].join("/");
        const thumbnailPath = [DIRECTORY, source, title].join("/");
        FFmpeg(videoPath, { timeout: TIMEOUT })
            .screenshot(
                {
                    count: 1,
                    timemarks: ["50%"],
                    size: "480x?",
                    filename: "tn.png",
                },
                thumbnailPath
            )
            .on("end", () => resolve())
            .on("error", (err: Error, _stdout: string, stderr: string) => {
                // the output (also in ffprobe's message) starts with a long
                // banner, so keep the first line and the last few, which say
                // what went wrong
                const lines = (err.message + "\n" + (stderr ?? ""))
                    .split("\n")
                    .map((line) => line.trim())
                    .filter((line) => line);
                const summary = new Set([lines[0], ...lines.slice(-3)]);
                reject(new Error(Array.from(summary).join("\n")));
            });
    });

type Job = { source: string; title: string; vid: string };

const queue: Job[] = [];
/** title folders with a job queued or running. */
const queued = new Set<string>();
/** failed videos and when they may be tried again. */
const failures = new Map<string, { count: number; retryAt: number }>();
let running = false;

const runQueue = async () => {
    running = true;
    let job: Job | undefined;
    while ((job = queue.shift())) {
        const { source, title, vid } = job;
        const videoKey = [source, title, vid].join("/");
        try {
            await generateThumbnail(source, title, vid);
            failures.delete(videoKey);
            log.info(`thumbnail saved for ${source}/${title}`);
        } catch (error) {
            const count = (failures.get(videoKey)?.count ?? 0) + 1;
            const wait = Math.min(RETRY_FIRST * 2 ** (count - 1), RETRY_MAX);
            failures.set(videoKey, { count, retryAt: Date.now() + wait });
            const minutes = Math.round(wait / 60000);
            log.error(
                `thumbnail for ${videoKey} failed, retrying in ${minutes} min`,
                error instanceof Error ? error.message : error
            );
        } finally {
            queued.delete([source, title].join("/"));
        }
    }
    running = false;
};

/**
 * queues a thumbnail for the title from its video vid. thumbnails are made
 * one at a time. does nothing without ffmpeg, if the title is already
 * queued, or if this video failed and its retry time hasn't come yet.
 */
export const queueThumbnail = (source: string, title: string, vid: string) => {
    if (!ffmpegExists) return;
    const titleKey = [source, title].join("/");
    if (queued.has(titleKey)) return;
    const failure = failures.get([source, title, vid].join("/"));
    if (failure && Date.now() < failure.retryAt) return;
    queued.add(titleKey);
    queue.push({ source, title, vid });
    if (!running) void runQueue();
};

/**
 * drops queued thumbnails that haven't started. used when the vite dev
 * plugin replaces this module, so two copies don't make the same thumbnails.
 */
export const clearThumbnailQueue = () => {
    for (const { source, title } of queue) {
        queued.delete([source, title].join("/"));
    }
    queue.length = 0;
};
