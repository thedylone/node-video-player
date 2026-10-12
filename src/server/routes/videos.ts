import { Router } from "express";
import * as path from "path";
import { DIRECTORY } from "../config";
import {
    DEFAULT_ORDER,
    deleteTitle,
    getVideos,
    SortKey,
    SortOrder,
    sortVideos,
} from "../db";
import { HttpError, requireVideo } from "../http";

export const router = Router();

const isSortKey = (key: unknown): key is SortKey =>
    typeof key === "string" &&
    Object.prototype.hasOwnProperty.call(DEFAULT_ORDER, key);

/**
 * GET list of videos in the database.
 * filters by source and searches for title and tags.
 * sorts by sort (added, name or count; default added) in order (asc or desc;
 * default newest, A-Z and most watched first).
 * access by /api/videos?filter=<source>&search=<search>&sort=<key>&order=<order>
 */
router.get("/videos", (req, res) => {
    const filter = req.query.filter?.toString().split(",");
    const search = req.query.search?.toString().toLowerCase() ?? "";
    const sort = req.query.sort ?? "added";
    if (!isSortKey(sort))
        throw new HttpError(400, "sort must be added, name or count");
    const order = req.query.order;
    if (order !== undefined && order !== "asc" && order !== "desc")
        throw new HttpError(400, "order must be asc or desc");
    const videos = getVideos(search, filter);
    res.json(sortVideos(videos, sort, order as SortOrder | undefined));
});

/**
 * GET video data by id.
 * access by /api/videos/id/<id>
 * returns 404 if id not found.
 */
router.get("/videos/id/:id", (req, res) => {
    res.json(requireVideo(req.params.id));
});

/**
 * DELETE deletes the title's folder from disk and removes it from the
 * database.
 * access by DELETE /api/videos/id/<id>
 * returns 404 if id not found.
 */
router.delete("/videos/id/:id", async (req, res) => {
    await deleteTitle(requireVideo(req.params.id));
    res.status(200).send("200 OK");
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
router.get("/thumbnail/:id", (req, res, next) => {
    const video = requireVideo(req.params.id);
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
            next(new HttpError(404));
            return;
        }
        next(error);
    });
});
