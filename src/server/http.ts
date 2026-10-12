import type { ErrorRequestHandler } from "express";
import { STATUS_CODES } from "http";
import { Video } from "../shared/schema";
import { getVideo } from "./db";
import { log } from "./log";

/** an error the error handler sends as its status and message. */
export class HttpError extends Error {
    status: number;
    constructor(status: number, message = STATUS_CODES[status] ?? "Error") {
        super(message);
        this.status = status;
    }
}

/**
 * returns the video with this id. throws 400 if id is not a string, or 404
 * if there is no such video.
 */
export const requireVideo = (id: unknown): Video => {
    if (typeof id !== "string") throw new HttpError(400, "id must be a string");
    const video = getVideo(id);
    if (!video) throw new HttpError(404);
    return video;
};

/** for paths no route handled. */
export const notFound = () => {
    throw new HttpError(404);
};

/**
 * sends errors as JSON: { "error": "<message>" }.
 * HttpErrors and client errors from express (e.g. a malformed JSON body) are
 * sent with their status and message. anything else is logged and sent as a
 * 500 without details.
 */
export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
    // unused, but express only treats handlers with four parameters as
    // error handlers
    void next;
    if (res.headersSent) {
        // too late for an error response, so all we can do is end it
        log.error(`${req.method} ${req.originalUrl}`, error);
        res.destroy();
        return;
    }
    let status = 500;
    let message = STATUS_CODES[500] as string;
    if (error instanceof HttpError) {
        ({ status, message } = error);
    } else if (error?.expose && Number.isInteger(error.status)) {
        // http-errors sets expose for 4xx errors, e.g. from body-parser
        ({ status, message } = error);
    } else {
        log.error(`${req.method} ${req.originalUrl}`, error);
    }
    res.status(status).json({ error: message });
};
