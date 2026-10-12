import FFmpeg from "fluent-ffmpeg";
import { DIRECTORY, FFMPEG_PATH, FFPROBE_PATH } from "./config";

export let ffmpegExists = false;
if (!FFMPEG_PATH || !FFPROBE_PATH) {
    process.stderr.write("ffmpeg path not found: thumbnails not generated\n");
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
        .on("error", (err, stdout, stderr) => {
            if (err) {
                process.stderr.write(err.message + "\n");
                process.stderr.write("stdout:\n" + stdout + "\n");
                process.stderr.write("stderr:\n" + stderr + "\n");
            }
        });
};
