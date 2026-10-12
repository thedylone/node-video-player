import { Router } from "express";
import { getVideo, updateTags } from "../db";

export const router = Router();

/** returns the trimmed tag, or undefined if it is not a non-empty string. */
const parseTag = (tag: unknown): string | undefined => {
    if (typeof tag !== "string") return undefined;
    return tag.trim() || undefined;
};

/**
 * POST replaces the title's tags.
 * access by POST /api/tags with body of {id: <id>, tags: <tags>}
 * tags must be an array of strings. they are trimmed, and empty or
 * duplicate tags are dropped.
 */
router.post("/tags", (req, res) => {
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
            process.stderr.write("POST /api/tags: " + error + "\n");
            res.status(500).send("500 Internal Server Error");
        });
});

/**
 * POST adds a tag to the title's tags. adding an existing tag does nothing.
 * access by POST /api/tag with body of {id: <id>, tag: <tag>}
 * tag must be a non-empty string, and is trimmed.
 */
router.post("/tag", (req, res) => {
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
            process.stderr.write("POST /api/tag: " + error + "\n");
            res.status(500).send("500 Internal Server Error");
        });
});

/**
 * DELETE removes a tag from the title's tags. removing a missing tag does
 * nothing.
 * access by DELETE /api/tag with body of {id: <id>, tag: <tag>}
 */
router.delete("/tag", (req, res) => {
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
            process.stderr.write("DELETE /api/tag: " + error + "\n");
            res.status(500).send("500 Internal Server Error");
        });
});
