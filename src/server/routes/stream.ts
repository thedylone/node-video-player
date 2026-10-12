import { Router } from "express";
import * as fs from "fs";
import * as fsp from "fs/promises";
import { DIRECTORY } from "../config";
import { videoType } from "../formats";
import { HttpError, requireVideo } from "../http";
import { log } from "../log";

export const router = Router();

/**
 * parses a Range header (single range only) for a file of the given size.
 * returns the byte range to send, null if the range can't be satisfied
 * (416), or undefined if the header should be ignored (send the whole file).
 */
const parseRange = (
    header: string,
    size: number
): { start: number; end: number } | null | undefined => {
    const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
    if (!match || (!match[1] && !match[2])) return undefined;
    let start: number;
    let end = size - 1;
    if (!match[1]) {
        // suffix range: the last <n> bytes
        start = Math.max(size - Number(match[2]), 0);
        if (Number(match[2]) === 0) return null;
    } else {
        start = Number(match[1]);
        if (match[2]) {
            if (Number(match[2]) < start) return undefined;
            end = Math.min(Number(match[2]), end);
        }
    }
    if (start >= size) return null;
    return { start, end };
};

/**
 * GET video data stream
 * index defaults to 0
 * access by /api/stream/<id>?index=<index>
 * supports single byte ranges (Range: bytes=<start>-<end> or bytes=-<n>).
 */
router.get("/stream/:id", async (req, res) => {
    if (req.socket.destroyed) {
        return;
    }
    const data = requireVideo(req.params.id);
    const indexParam = req.query.index ?? "0";
    if (typeof indexParam !== "string" || !/^\d+$/.test(indexParam))
        throw new HttpError(400, "index must be a non-negative integer");
    const video = data.vids[Number(indexParam)];
    if (!video) throw new HttpError(404);
    const videoPath = [DIRECTORY, data.source, data.title, video].join("/");
    let fileSize: number;
    try {
        fileSize = (await fsp.stat(videoPath)).size;
    } catch (error) {
        // deleted or moved since the last scan
        log.error("stream", error);
        throw new HttpError(404);
    }
    const contentType = videoType(video) ?? "application/octet-stream";
    const range = req.headers.range
        ? parseRange(req.headers.range, fileSize)
        : undefined;
    if (range === null) {
        res.setHeader("Content-Range", `bytes */${fileSize}`);
        throw new HttpError(416);
    }
    let stream: fs.ReadStream;
    if (range) {
        const { start, end } = range;
        const head = {
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": end - start + 1,
            "Content-Type": contentType,
        };
        res.writeHead(206, head);
        stream = fs.createReadStream(videoPath, { start, end });
    } else {
        const head = {
            "Accept-Ranges": "bytes",
            "Content-Length": fileSize,
            "Content-Type": contentType,
        };
        res.writeHead(200, head);
        stream = fs.createReadStream(videoPath);
    }
    stream.on("error", (error) => {
        // headers are already sent, so all we can do is end the response
        log.error("stream", error);
        res.destroy();
    });
    stream.pipe(res);
    res.on("close", () => {
        stream.destroy();
    });
});
