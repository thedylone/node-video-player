import { Router } from "express";
import { addCount } from "../db";
import { HttpError, requireVideo } from "../http";

export const router = Router();

/** returns num as an integer (numeric strings allowed), or undefined. */
const parseNum = (num: unknown): number | undefined => {
    const value = typeof num === "string" && num.trim() ? Number(num) : num;
    return Number.isInteger(value) ? (value as number) : undefined;
};

/**
 * POST adds num to the title's counter.
 * returns the new counter as JSON.
 * access by POST /api/count with body of {id: <id>, num: <num>}
 * num must be an integer.
 */
router.post("/count", async (req, res) => {
    const num = parseNum(req.body.num);
    if (num === undefined) throw new HttpError(400, "num must be an integer");
    const video = requireVideo(req.body.id);
    res.json(await addCount(video, num));
});
