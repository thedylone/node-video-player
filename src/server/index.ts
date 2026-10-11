import express, { urlencoded } from "express";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as fsp from "fs/promises";
import * as path from "path";
import jsonfile from "jsonfile";
import { nanoid } from "nanoid";
import FFmpeg from "fluent-ffmpeg";
import { Video } from "./schema";

dotenv.config({ path: process.cwd() + "/.env" });
const FFMPEG_PATH = process.env.FFMPEG_PATH;
const FFPROBE_PATH = process.env.FFPROBE_PATH;
const DB_FILE = process.env.DB_FILE ?? "db.json";
const DIRECTORY = process.env.DIRECTORY ?? "videos";

let ffmpegExists = false;
if (!FFMPEG_PATH || !FFPROBE_PATH) {
    process.stderr.write("ffmpeg path not found: thumbnails not generated\n");
} else {
    FFmpeg.setFfmpegPath(FFMPEG_PATH);
    FFmpeg.setFfprobePath(FFPROBE_PATH);
    ffmpegExists = true;
}

export const app = express();
app.use(express.json());
app.use(urlencoded({ extended: false }));

const loadDatabase = (): { [key: string]: Video } => {
    if (!fs.existsSync(DB_FILE)) {
        process.stdout.write(DB_FILE + " not found: starting with empty database\n");
        return {};
    }
    const db: { [key: string]: Video } = jsonfile.readFileSync(DB_FILE);
    // drop empty or non-string tags saved before tags were validated
    for (const video of Object.values(db)) {
        video.tags = (video.tags ?? []).filter(
            (tag) => typeof tag === "string" && tag.trim()
        );
    }
    return db;
};

const database = loadDatabase();

const generateThumbnail = (source: string, title: string, vid: string) => {
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

const addDirToDatabase = async () => {
    const exists = [];
    const current = new Map(
        Object.values(database).map((x) => [x.source + "/" + x.title, x.id])
    );
    const sources = (await fsp.readdir(DIRECTORY, { withFileTypes: true }))
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);
    for (const source of sources) {
        const sourcePath = [DIRECTORY, source].join("/");
        const titles = (await fsp.readdir(sourcePath, { withFileTypes: true }))
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name);
        for (const title of titles) {
            exists.push([source, title].join("/"));
            const titlePath = [sourcePath, title].join("/");
            const files = await fsp.readdir(titlePath);
            const vids = files
                .filter((x) => x.endsWith(".mp4"))
                .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
            // existing title: refresh its videos, keeping counter and tags
            const currentId = current.get([source, title].join("/"));
            if (currentId) database[currentId].vids = vids;
            if (!vids.length) continue;
            if (files.length == vids.length && ffmpegExists)
                generateThumbnail(source, title, vids[0]);
            if (currentId) continue;
            const id = nanoid(12);
            database[id] = {
                id: id,
                title: title,
                source: source,
                counter: 0,
                tags: [],
                vids: vids,
            };
        }
    }
    return exists;
};

const pruneDatabase = (exists: string[]) => {
    if (!exists) return;
    for (const id in database) {
        if (!exists.includes(database[id].source + "/" + database[id].title)) {
            delete database[id];
        }
    }
};

/**
 * scans DIRECTORY, prunes missing titles and saves the database.
 * never rejects: errors are logged so a failed scan can't crash the server.
 */
const updateDatabase = async () => {
    try {
        const exists = await addDirToDatabase();
        pruneDatabase(exists);
        await jsonfile.writeFile(DB_FILE, database);
        process.stdout.write("database updated\n");
    } catch (error) {
        process.stderr.write("updateDatabase: " + error + "\n");
    }
};

/**
 * returns the video with this id, or undefined.
 * only own keys count, so ids like "__proto__" can't reach Object.prototype.
 */
const getVideo = (id: unknown): Video | undefined => {
    if (typeof id !== "string") return undefined;
    if (!Object.prototype.hasOwnProperty.call(database, id)) return undefined;
    return database[id];
};

/** returns the trimmed tag, or undefined if it is not a non-empty string. */
const parseTag = (tag: unknown): string | undefined => {
    if (typeof tag !== "string") return undefined;
    return tag.trim() || undefined;
};

/** returns num as an integer (numeric strings allowed), or undefined. */
const parseNum = (num: unknown): number | undefined => {
    const value = typeof num === "string" && num.trim() ? Number(num) : num;
    return Number.isInteger(value) ? (value as number) : undefined;
};

const getVideos = (search: string, filter?: string[]) => {
    const videos: Video[] = [];
    for (const video of Object.values(database)) {
        if (filter && !filter.includes(video.source)) continue;
        if (
            !video.title.toLowerCase().includes(search) &&
            !video.tags.some(
                (x) => typeof x === "string" && x.toLowerCase().includes(search)
            )
        )
            continue;
        videos.push(video);
    }
    return videos;
};

async function addCount(id: string, num: number): Promise<number> {
    if (!getVideo(id)) {
        process.stderr.write("addCount: id not found\n");
        return -1;
    }
    database[id].counter += num;
    return database[id].counter;
}

async function deleteTitle(id: string): Promise<boolean> {
    if (!getVideo(id)) {
        process.stderr.write("deleteTitle: id not found\n");
        return false;
    }
    const source = database[id].source;
    const title = database[id].title;
    const success = await fsp
        .rm([DIRECTORY, source, title].join("/"), {
            recursive: true,
            force: true,
        })
        .then(() => {
            delete database[id];
            process.stdout.write("delete complete\n");
        });
    if (success == undefined) return true;
    return false;
}

async function updateTags(id: string, tags: string[]): Promise<boolean> {
    if (!getVideo(id)) {
        process.stderr.write("updateTags: id not found\n");
        return false;
    }
    database[id].tags = tags;
    return true;
}

app.get("/api/test", (_req, res) => {
    res.json({ message: "Hello from server!" });
});

/**
 * GET list of videos in the database.
 * filters by source and searches for title and tags.
 * access by /api/videos?filter=<source>&search=<search>
 */
app.get("/api/videos", (req, res) => {
    const filter = req.query.filter?.toString().split(",");
    const search = req.query.search?.toString().toLowerCase() ?? "";
    res.json(getVideos(search, filter));
});

/**
 * GET video data by id.
 * access by /api/videos/id/<id>
 * returns 404 if id not found.
 */
app.get("/api/videos/id/:id", (req, res) => {
    const video = getVideo(req.params.id);
    if (!video) {
        res.status(404).end("404 Not Found");
        return;
    }
    res.json(video);
});

/**
 * GET list of videos in the search results.
 * filters by source and searches for title and tags.
 * access by /api/videos/search/<search>?filter=<source>
 */
app.get("/api/videos/search/:search", (req, res) => {
    const search = req.params.search.toLowerCase();
    const filter = req.query.filter?.toString().split(",");
    res.json(getVideos(search, filter));
});

/**
 * GET list of sources in the database.
 * access by /api/sources
 */
app.get("/api/sources", (_req, res) => {
    const sources = new Set(Object.values(database).map((x) => x.source));
    res.json(Array.from(sources));
});

/**
 * GET list of sources in the search results.
 * access by /api/sources?search=<search>
 */
app.get("/api/sources/search/:search", (req, res) => {
    const search = req.params.search.toLowerCase();
    const videos = getVideos(search);
    const sources = new Set(videos.map((x) => x.source));
    res.json(Array.from(sources));
});

const MIME_TYPES: { [ext: string]: string } = {
    ".mp4": "video/mp4",
    ".m4v": "video/mp4",
    ".webm": "video/webm",
    ".mkv": "video/x-matroska",
    ".mov": "video/quicktime",
};

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
app.get("/api/stream/:id", async (req, res) => {
    if (req.socket.destroyed) {
        return;
    }
    const data = getVideo(req.params.id);
    if (!data) {
        res.status(404).end("404 Not Found");
        return;
    }
    const indexParam = req.query.index ?? "0";
    if (typeof indexParam !== "string" || !/^\d+$/.test(indexParam)) {
        res.status(400).end("400 Bad Request");
        return;
    }
    const video = data.vids[Number(indexParam)];
    if (!video) {
        res.status(404).end("404 Not Found");
        return;
    }
    const videoPath = [DIRECTORY, data.source, data.title, video].join("/");
    let fileSize: number;
    try {
        fileSize = (await fsp.stat(videoPath)).size;
    } catch (error) {
        process.stderr.write("stream: " + error + "\n");
        res.status(404).end("404 Not Found");
        return;
    }
    const contentType =
        MIME_TYPES[path.extname(video).toLowerCase()] ??
        "application/octet-stream";
    const range = req.headers.range
        ? parseRange(req.headers.range, fileSize)
        : undefined;
    if (range === null) {
        res.writeHead(416, { "Content-Range": `bytes */${fileSize}` });
        res.end();
        return;
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
        process.stderr.write("stream: " + error + "\n");
        res.destroy();
    });
    stream.pipe(res);
    res.on("close", () => {
        stream.destroy();
    });
});

/**
 * GET 'thumbnail' path handler with query of id.
 * returns thumbnail png if found.
 * access by /api/thumbnail?id=<id>
 */
app.get("/api/thumbnail/:id", (req, res) => {
    const video = getVideo(req.params.id);
    if (!video) {
        res.status(404).send("not found");
        return;
    }
    const title = video.title;
    const source = video.source;
    const thumbnail = [DIRECTORY, source, title, "tn.png"].join("/");
    try {
        res.sendFile(thumbnail, { root: process.cwd() });
    } catch {
        res.status(500).send("500 Internal Server Error");
    }
});

/**
 * POST 'count' path handler. adds to the database's id's counter.
 * returns the new counter.
 * access by /api/count with body of {id: <id>, num: <num>}
 * num must be an integer.
 */
app.post("/api/count", (req, res) => {
    const id: unknown = req.body.id;
    const num = parseNum(req.body.num);
    if (typeof id !== "string" || num === undefined) {
        res.status(400).send("400 Bad Request");
        return;
    }
    if (!getVideo(id)) {
        res.status(404).send("404 Not Found");
        return;
    }
    addCount(id, num)
        .then((count) => {
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.end(count.toString());
        })
        .catch((error) => {
            process.stderr.write(error + "\n");
            res.status(500).send("500 Internal Server Error");
        });
});

/**
 * DELETE 'video' path handler. deletes the database's id.
 * returns true if successful, false otherwise.
 * access by DELETE /api/videos/id/<id>
 */
app.delete("/api/videos/id/:id", (req, res) => {
    const id: string = req.params.id;
    if (!id) {
        res.status(400).send("400 Bad Request");
        return;
    }
    deleteTitle(id)
        .then((success) => {
            if (success) {
                res.status(200).send("200 OK");
            } else {
                res.status(500).send("500 Internal Server Error");
            }
        })
        .catch((error) => {
            process.stderr.write("/delete catch: " + error + "\n");
            res.status(500).send("500 Internal Server Error");
        });
});

/**
 * POST 'tags' path handler. updates the database's id's tags.
 * returns true if successful, false otherwise.
 * access by /api/tags with body of {id: <id>, tags: <tags>}
 * tags must be an array of strings. they are trimmed, and empty or
 * duplicate tags are dropped.
 */
app.post("/api/tags", (req, res) => {
    const id: unknown = req.body.id;
    const tags: unknown = req.body.tags;
    if (
        typeof id !== "string" ||
        !Array.isArray(tags) ||
        !tags.every((tag) => typeof tag === "string")
    ) {
        res.status(400).send("400 Bad Request");
        return;
    }
    if (!getVideo(id)) {
        res.status(404).send("404 Not Found");
        return;
    }
    const parsed = tags.map(parseTag).filter((tag): tag is string => !!tag);
    updateTags(id, Array.from(new Set(parsed)))
        .then((success) => {
            if (success) {
                res.status(200).send("200 OK");
            } else {
                res.status(500).send("500 Internal Server Error");
            }
        })
        .catch((error) => {
            process.stderr.write("/tags catch: " + error + "\n");
            res.status(500).send("500 Internal Server Error");
        });
});

/**
 * POST 'tags/add' path handler. adds a tag to the database's id's tags.
 * returns true if successful, false otherwise.
 * access by /tags/add with body of {id: <id>, tag: <tag>}
 * tag must be a non-empty string, and is trimmed.
 */
app.post("/api/tag", (req, res) => {
    const id: unknown = req.body.id;
    const tag = parseTag(req.body.tag);
    if (typeof id !== "string" || !tag) {
        res.status(400).send("400 Bad Request");
        return;
    }
    const video = getVideo(id);
    if (!video) {
        res.status(404).send("404 Not Found");
        return;
    }
    const tags = video.tags;
    if (tags.includes(tag)) {
        res.status(200).send("200 OK");
        return;
    }
    tags.push(tag);
    updateTags(id, tags)
        .then((success) => {
            if (success) {
                res.status(200).send("200 OK");
            } else {
                res.status(500).send("500 Internal Server Error");
            }
        })
        .catch((error) => {
            process.stderr.write("/tags/add catch: " + error + "\n");
            res.status(500).send("500 Internal Server Error");
        });
});

/**
 * DELETE 'tag' path handler. removes a tag from the database's id's tags.
 * returns true if successful, false otherwise.
 * access by DELETE /api/tag with body of {id: <id>, tag: <tag>}
 */
app.delete("/api/tag", (req, res) => {
    const id: unknown = req.body.id;
    const tag: unknown = req.body.tag;
    // any string is allowed here, so empty tags saved before can be removed
    if (typeof id !== "string" || typeof tag !== "string") {
        res.status(400).send("400 Bad Request");
        return;
    }
    const video = getVideo(id);
    if (!video) {
        res.status(404).send("404 Not Found");
        return;
    }
    const tags = video.tags;
    if (!tags.includes(tag)) {
        res.status(200).send("200 OK");
        return;
    }
    const index = tags.indexOf(tag);
    tags.splice(index, 1);
    updateTags(id, tags)
        .then((success) => {
            if (success) {
                res.status(200).send("200 OK");
            } else {
                res.status(500).send("500 Internal Server Error");
            }
        })
        .catch((error) => {
            process.stderr.write("/tags/remove catch: " + error + "\n");
            res.status(500).send("500 Internal Server Error");
        });
});

const start = async () => {
    process.stdout.write("server started\n");
    const startTime = new Date().getTime();
    // show uptime in hh:mm:ss and update every second by clearing the line.
    // only on a terminal: clearLine and cursorTo don't exist when piped
    if (process.stdout.isTTY) {
        setInterval(() => {
            const currentTime = Date.now();
            const uptime = currentTime - startTime;
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
            const secs = String(Math.floor(uptime / 1000) % 60).padStart(2, "0");
            const mins = String(Math.floor(uptime / 60000) % 60).padStart(2, "0");
            const hours = String(Math.floor(uptime / 3600000)).padStart(2, "0");
            process.stdout.write(`uptime: ${hours}:${mins}:${secs}\t`);
        }, 1000);
    }
    updateDatabase();
    setInterval(updateDatabase, 60000);
};

if (!process.env["VITE"]) {
    const frontendFiles = path.join(process.cwd(), "dist");
    app.use(express.static(frontendFiles));
    app.get("/*", (_, res) => {
        res.sendFile(path.join(frontendFiles, "index.html"));
    });
    const port = Number(process.env["PORT"]) || 3000;
    app.listen(port, () => {
        process.stdout.write(`listening on http://localhost:${port}\n`);
    });
}

start();
