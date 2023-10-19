import express, { urlencoded } from "express";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as fsp from "fs/promises";
import jsonfile from "jsonfile";
import { nanoid } from "nanoid";
import FFmpeg from "fluent-ffmpeg";
import { Video } from "./schema";

dotenv.config({ path: process.cwd() + "/.env" });
const FFMPEG_PATH = process.env.FFMPEG_PATH;
const FFPROBE_PATH = process.env.FFPROBE_PATH;
const DB_FILE = process.env.DB_FILE ?? "/db.json";
const DIRECTORY = process.env.DIRECTORY ?? "/videos";

if (!FFMPEG_PATH || !FFPROBE_PATH) {
    console.log("ffmpeg path not found");
    process.exit(1);
}

FFmpeg.setFfmpegPath(FFMPEG_PATH);
FFmpeg.setFfprobePath(FFPROBE_PATH);

export const app = express();
app.use(express.json());
app.use(urlencoded({ extended: false }));

const database: { [key: string]: Video } = jsonfile.readFileSync(DB_FILE);

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
                console.log(err.message);
                console.log("stdout:\n" + stdout);
                console.log("stderr:\n" + stderr);
            }
        });
};

const addDirToDatabase = async () => {
    const exists = [];
    const current = Object.values(database).map(
        (x) => x.source + "/" + x.title
    );
    const sources = await fsp.readdir(DIRECTORY);
    for (const source of sources) {
        const sourcePath = [DIRECTORY, source].join("/");
        const titles = (await fsp.readdir(sourcePath, { withFileTypes: true }))
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name);
        for (const title of titles) {
            exists.push([source, title].join("/"));
            const titlePath = [sourcePath, title].join("/");
            const files = await fsp.readdir(titlePath);
            const vids = files.filter((x) => x.endsWith(".mp4"));
            if (!vids.length) continue;
            if (files.length == vids.length)
                generateThumbnail(source, title, vids[0]);
            if (current.includes([source, title].join("/"))) continue;
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

const updateDatabase = async () => {
    const exists = await addDirToDatabase();
    pruneDatabase(exists);
    jsonfile
        .writeFile(DB_FILE, database)
        .then(() => console.log("write complete"));
    setTimeout(updateDatabase, 1000 * 60);
};

const getVideos = (search: string, filter?: string[]) => {
    const videos: Video[] = [];
    for (const id in database) {
        const video = database[id];
        if (filter && !filter.includes(video.source)) continue;
        if (
            !video.title.toLowerCase().includes(search) &&
            !video.tags.some((x) => x.toLowerCase().includes(search))
        )
            continue;
        videos.push(video);
    }
    return videos;
};

async function addCount(id: string, num: number): Promise<number> {
    if (!database[id]) {
        console.log("addCount: id not found");
        return -1;
    }
    database[id].counter += num;
    jsonfile
        .writeFile(DB_FILE, database)
        .then(() => console.log("write complete"));
    return database[id].counter;
}

async function deleteTitle(id: string): Promise<boolean> {
    if (!database[id]) {
        console.log("deleteTitle: id not found");
        return false;
    }
    const source = database[id].source;
    const title = database[id].title;
    const success = await fsp
        .rm([DIRECTORY, source, title].join("/"), {
            recursive: true,
        })
        .then(() => {
            delete database[id];
            console.log("delete complete");
        }, console.log);
    if (success == undefined) return true;
    return false;
}

async function updateTags(id: string, tags: string[]): Promise<boolean> {
    if (!database[id]) {
        console.log("updateTags: id not found");
        return false;
    }
    database[id].tags = tags;
    return jsonfile.writeFile(DB_FILE, database).then(
        () => {
            console.log("write complete");
            return true;
        },
        (error) => {
            console.log(error);
            return false;
        }
    );
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
    const id = req.params.id;
    if (!database[id]) {
        res.status(404).end("404 Not Found");
        return;
    }
    res.json(database[id]);
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

/**
 * GET video data stream
 * index defaults to 0
 * access by /api/stream/<id>?index=<index>
 */
app.get("/api/stream/:id", (req, res) => {
    if (req.socket.destroyed) {
        return;
    }
    const id = req.params.id;
    const index = parseInt(req.query.index?.toString() ?? "0");
    if (!database[id]) {
        res.status(404).end("404 Not Found");
        return;
    }
    const data = database[id];
    const video = data.vids[index];
    const title = data.title;
    const videoPath = [DIRECTORY, data.source, title, video].join("/");
    let stream: fs.ReadStream;
    let videoStat;
    try {
        videoStat = fs.statSync(videoPath);
    } catch (error) {
        console.log(error);
    }
    if (!videoStat) {
        res.status(404).end("404 Not Found");
        return;
    }
    const fileSize = videoStat.size;
    const videoRange = req.headers.range;
    if (videoRange) {
        const parts = videoRange.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = end - start + 1;
        stream = fs.createReadStream(videoPath, { start, end });
        const head = {
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": chunksize,
            "Content-Type": "video/mp4",
        };
        res.writeHead(206, head);
    } else {
        const head = {
            "Content-Length": fileSize,
            "Content-Type": "video/mp4",
        };
        res.writeHead(200, head);
        stream = fs.createReadStream(videoPath);
    }
    stream.pipe(res);
    res.on("close", () => {
        if (stream) stream.destroy();
    });
});

/**
 * GET 'thumbnail' path handler with query of id.
 * returns thumbnail png if found.
 * access by /api/thumbnail?id=<id>
 */
app.get("/api/thumbnail/:id", (req, res) => {
    const id = req.params.id;
    if (!database[id]) {
        res.status(404).send("not found");
        return;
    }
    const title = database[id].title;
    const source = database[id].source;
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
 */
app.post("/api/count", (req, res) => {
    const id: string = req.body.id;
    const num: string = req.body.num;
    if (!id || !num) {
        res.status(400).send("400 Bad Request");
        return;
    }
    addCount(id, parseInt(num))
        .then((count) => {
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.end(count.toString());
        })
        .catch((error) => {
            console.log(error);
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
            console.log("/delete catch: " + error);
            res.status(500).send("500 Internal Server Error");
        });
});

/**
 * POST 'tags' path handler. updates the database's id's tags.
 * returns true if successful, false otherwise.
 * access by /api/tags with body of {id: <id>, tags: <tags>}
 */
app.post("/api/tags", (req, res) => {
    const id: string = req.body.id;
    const _tags: string[] | string = req.body.tags;
    const tags = Array.isArray(_tags) ? _tags : [_tags];
    if (!id || !tags) {
        res.status(400).send("400 Bad Request");
        return;
    }
    updateTags(id, tags)
        .then((success) => {
            if (success) {
                res.status(200).send("200 OK");
            } else {
                res.status(500).send("500 Internal Server Error");
            }
        })
        .catch((error) => {
            console.log("/tags catch: " + error);
            res.status(500).send("500 Internal Server Error");
        });
});

/**
 * POST 'tags/add' path handler. adds a tag to the database's id's tags.
 * returns true if successful, false otherwise.
 * access by /tags/add with body of {id: <id>, tag: <tag>}
 */
app.post("/api/tag", (req, res) => {
    const id: string = req.body.id;
    const tag: string = req.body.tag;
    if (!id) {
        res.status(400).send("400 Bad Request");
        return;
    }
    if (!database[id]) {
        res.status(404).send("404 Not Found");
        return;
    }
    const tags = database[id].tags;
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
            console.log("/tags/add catch: " + error);
            res.status(500).send("500 Internal Server Error");
        });
});

/**
 * DELETE 'tag' path handler. removes a tag from the database's id's tags.
 * returns true if successful, false otherwise.
 * access by DELETE /api/tag with body of {id: <id>, tag: <tag>}
 */
app.delete("/api/tag", (req, res) => {
    const id: string = req.body.id;
    const tag: string = req.body.tag;
    if (!id) {
        res.status(400).send("400 Bad Request");
        return;
    }
    if (!database[id]) {
        res.status(404).send("404 Not Found");
        return;
    }
    const tags = database[id].tags;
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
            console.log("/tags/remove catch: " + error);
            res.status(500).send("500 Internal Server Error");
        });
});

updateDatabase();

if (!process.env["VITE"]) {
    const frontendFiles = process.cwd() + "/dist";
    app.use(express.static(frontendFiles));
    app.get("/*", (_, res) => {
        res.send(frontendFiles + "/index.html");
    });
    app.listen(process.env["PORT"]);
}
