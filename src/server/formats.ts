import * as path from "path";

/** MIME types of the video files a title can hold, by lowercase extension. */
const VIDEO_TYPES: { [ext: string]: string } = {
    ".mp4": "video/mp4",
    ".m4v": "video/mp4",
    ".webm": "video/webm",
    ".mkv": "video/x-matroska",
    ".mov": "video/quicktime",
};

/**
 * returns the MIME type of a video file name, or undefined if it is not a
 * video. extensions are matched ignoring case (e.g. "clip.MP4").
 */
export const videoType = (file: string): string | undefined => {
    const ext = path.extname(file).toLowerCase();
    return Object.prototype.hasOwnProperty.call(VIDEO_TYPES, ext)
        ? VIDEO_TYPES[ext]
        : undefined;
};

/** whether a file name is a video the server lists and streams. */
export const isVideo = (file: string) => videoType(file) !== undefined;
