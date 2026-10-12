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

export const generateThumbnail = (
    source: string,
    title: string,
    vid: string
) => {
    const videoPath = [DIRECTORY, source, title, vid].join("/");
    const thumbnailPath = [DIRECTORY, source, title].join("/");
    FFmpeg(videoPath)
        .screenshot(
            {
                count: 1,
                timemarks: ["50%"],
                size: "480x?",
            },
            thumbnailPath
        )
        .on("error", (err: Error, _stdout: string, stderr: string) => {
            // ffmpeg's output starts with a long banner; the cause is at the end
            const tail = (stderr ?? "").trim().split("\n").slice(-5).join("\n");
            log.error(`thumbnail for ${videoPath}: ${err.message}\n${tail}`);
        });
};
