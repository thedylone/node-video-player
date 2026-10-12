import { Router } from "express";
import * as path from "path";
import { DIRECTORY } from "../config";
import { deleteTitle, getVideo, getVideos } from "../db";

export const router = Router();

/**
 * GET list of videos in the database.
 * filters by source and searches for title and tags.
 * access by /api/videos?filter=<source>&search=<search>
 */
router.get("/videos", (req, res) => {
    const filter = req.query.filter?.toString().split(",");
    const search = req.query.search?.toString().toLowerCase() ?? "";
    res.json(getVideos(search, filter));
});

/**
 * GET video data by id.
 * access by /api/videos/id/<id>
 * returns 404 if id not found.
 */
router.get("/videos/id/:id", (req, res) => {
    const video = getVideo(req.params.id);
    if (!video) {
        res.status(404).end("404 Not Found");
        return;
    }
    res.json(video);
});

/**
 * DELETE deletes the title's folder from disk and removes it from the
 * database.
 * access by DELETE /api/videos/id/<id>
 * returns 404 if id not found.
 */
router.delete("/videos/id/:id", (req, res) => {
    const id = req.params.id;
    if (!getVideo(id)) {
        res.status(404).send("404 Not Found");
        return;
    }
    deleteTitle(id)
        .then(() => {
            res.status(200).send("200 OK");
        })
        .catch((error) => {
            process.stderr.write("DELETE /api/videos/id: " + error + "\n");
            res.status(500).send("500 Internal Server Error");
        });
});

/**
 * GET list of sources in the database.
 * with a search, only sources with matching videos are listed.
 * access by /api/sources?search=<search>
 */
router.get("/sources", (req, res) => {
    const search = req.query.search?.toString().toLowerCase() ?? "";
    const sources = new Set(getVideos(search).map((x) => x.source));
    res.json(Array.from(sources));
});

/**
 * GET thumbnail png of a title.
 * access by /api/thumbnail/<id>
 * returns 404 if id not found or the title has no thumbnail.
 */
router.get("/thumbnail/:id", (req, res) => {
    const video = getVideo(req.params.id);
    if (!video) {
        res.status(404).send("404 Not Found");
        return;
    }
    const thumbnail = path.resolve(
        DIRECTORY,
        video.source,
        video.title,
        "tn.png"
    );
    // the path comes from the scan, not the request, so dotted folders
    // (e.g. a DIRECTORY inside a hidden folder) are fine
    res.sendFile(thumbnail, { dotfiles: "allow" }, (error) => {
        // headers are already sent if the client went away mid-transfer
        if (!error || res.headersSent) return;
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            res.status(404).send("404 Not Found");
            return;
        }
        process.stderr.write("thumbnail: " + error + "\n");
        res.status(500).send("500 Internal Server Error");
    });
});
