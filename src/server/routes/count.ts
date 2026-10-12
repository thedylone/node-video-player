import { Router } from "express";
import { addCount, getVideo } from "../db";

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
router.post("/count", (req, res) => {
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
            res.json(count);
        })
        .catch((error) => {
            process.stderr.write(error + "\n");
            res.status(500).send("500 Internal Server Error");
        });
});
