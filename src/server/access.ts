import { createHash, timingSafeEqual } from "crypto";
import type { RequestHandler } from "express";

/** whether a host name or address only reaches this machine. */
export const isLoopback = (host: string) =>
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "::1" ||
    host === "[::1]" ||
    /^127\.\d+\.\d+\.\d+$/.test(host);

/** the host name of a Host header or an Origin, without the port. */
const hostname = (host: string) => {
    try {
        return new URL(host.includes("://") ? host : "http://" + host).hostname;
    } catch {
        return undefined;
    }
};

/**
 * refuses requests whose Host header isn't a name for this machine or one of
 * the allowed host names. used when the server only listens on a loopback
 * address: otherwise a web page whose domain is made to resolve to 127.0.0.1
 * (DNS rebinding) could use the API as if it were the same site.
 */
export const localHostsOnly = (allowed: string[] = []): RequestHandler => {
    const names = new Set(allowed.map((x) => x.toLowerCase()));
    return (req, res, next) => {
        const name = hostname(req.headers.host ?? "");
        if (name && (isLoopback(name) || names.has(name))) {
            next();
            return;
        }
        res.status(403)
            .type("text")
            .send("Forbidden: add this host name to ALLOWED_HOSTS to use it");
    };
};

/**
 * refuses changes (anything but GET and HEAD) sent by another site, e.g. a
 * form on a web page posting to /api/count. browsers send an Origin header
 * with these requests; tools such as curl don't, and are let through.
 */
export const sameOriginWrites: RequestHandler = (req, res, next) => {
    const origin = req.headers.origin;
    if (req.method === "GET" || req.method === "HEAD" || origin === undefined) {
        next();
        return;
    }
    let host: string | undefined;
    try {
        host = new URL(origin).host;
    } catch {
        // e.g. "null", sent by sandboxed pages and some redirects
    }
    // a reverse proxy may pass the site's host on in X-Forwarded-Host. a
    // cross-site request can't set that header without a CORS preflight,
    // which this server never allows
    const forwarded = req.headers["x-forwarded-host"];
    if (host && (host === req.headers.host || host === forwarded)) {
        next();
        return;
    }
    res.status(403).json({
        error: "requests from other sites are not allowed",
    });
};

const digest = (value: string) => createHash("sha256").update(value).digest();

/**
 * requires HTTP Basic authentication with the given password (any user name)
 * for every request. browsers ask for it once and then send it by themselves.
 */
export const requirePassword = (password: string): RequestHandler => {
    const expected = digest(password);
    return (req, res, next) => {
        const [scheme, encoded] = (req.headers.authorization ?? "").split(" ");
        if (scheme?.toLowerCase() === "basic" && encoded) {
            // "<user>:<password>"; the password may contain colons
            const credentials = Buffer.from(encoded, "base64").toString();
            const colon = credentials.indexOf(":");
            const given = credentials.slice(colon + 1);
            // compared as hashes, so the time taken doesn't depend on how
            // much of the password is right, or on its length
            if (colon >= 0 && timingSafeEqual(digest(given), expected)) {
                next();
                return;
            }
        }
        res.status(401).set(
            "WWW-Authenticate",
            'Basic realm="video player", charset="UTF-8"'
        );
        if (req.path === "/api" || req.path.startsWith("/api/")) {
            res.json({ error: "password required" });
        } else {
            res.type("text").send("Password required");
        }
    };
};
