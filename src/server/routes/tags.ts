import { Router } from "express";
import { getTags, updateTags } from "../db";
import { HttpError, requireVideo } from "../http";

export const router = Router();

/** returns the trimmed tag, or undefined if it is not a non-empty string. */
const parseTag = (tag: unknown): string | undefined => {
    if (typeof tag !== "string") return undefined;
    return tag.trim() || undefined;
};

/**
 * GET every tag in use, the most used first.
 * access by /api/tags
 */
router.get("/tags", (_req, res) => {
    res.json(getTags());
});

/**
 * POST replaces the title's tags.
 * access by POST /api/tags with body of {id: <id>, tags: <tags>}
 * tags must be an array of strings. they are trimmed, and empty or
 * duplicate tags are dropped.
 */
router.post("/tags", async (req, res) => {
    const tags: unknown = req.body.tags;
    if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === "string"))
        throw new HttpError(400, "tags must be an array of strings");
    const video = requireVideo(req.body.id);
    const parsed = tags.map(parseTag).filter((tag): tag is string => !!tag);
    await updateTags(video, Array.from(new Set(parsed)));
    res.status(200).send("200 OK");
});

/**
 * POST adds a tag to the title's tags. adding an existing tag does nothing.
 * access by POST /api/tag with body of {id: <id>, tag: <tag>}
 * tag must be a non-empty string, and is trimmed.
 */
router.post("/tag", async (req, res) => {
    const tag = parseTag(req.body.tag);
    if (!tag) throw new HttpError(400, "tag must be a non-empty string");
    const video = requireVideo(req.body.id);
    if (!video.tags.includes(tag)) {
        await updateTags(video, [...video.tags, tag]);
    }
    res.status(200).send("200 OK");
});

/**
 * DELETE removes a tag from the title's tags. removing a missing tag does
 * nothing.
 * access by DELETE /api/tag with body of {id: <id>, tag: <tag>}
 */
router.delete("/tag", async (req, res) => {
    const tag: unknown = req.body.tag;
    // any string is allowed here, so empty tags saved before can be removed
    if (typeof tag !== "string")
        throw new HttpError(400, "tag must be a string");
    const video = requireVideo(req.body.id);
    if (video.tags.includes(tag)) {
        await updateTags(
            video,
            video.tags.filter((x) => x !== tag)
        );
    }
    res.status(200).send("200 OK");
});
