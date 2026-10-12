import * as fs from "fs";
import * as fsp from "fs/promises";
import { nanoid } from "nanoid";
import * as path from "path";
import { Video } from "../shared/schema";
import { DB_FILE, DIRECTORY } from "./config";
import { database, saveDatabase } from "./db";
import { queueThumbnail } from "./ffmpeg";
import { isVideo } from "./formats";
import { log } from "./log";

/** how long a pruned title can still be matched to a renamed folder. */
const PRUNE_GRACE = 10 * 60 * 1000;

/**
 * titles pruned in the last PRUNE_GRACE, by id. kept in memory only, so a
 * folder moved while a scan was running (and seen in neither place) still
 * keeps its counter and tags when the next scan finds it.
 */
const pruned = new Map<string, { video: Video; at: number }>();

type Folder = {
    source: string;
    title: string;
    vids: string[];
    /** when the folder was created, in ms since 1970. */
    created: number;
};

/**
 * lists every title folder in DIRECTORY with its videos, and queues
 * thumbnails for those without one.
 */
const scanDirectory = async (): Promise<Folder[]> => {
    const folders: Folder[] = [];
    const sources = (await fsp.readdir(DIRECTORY, { withFileTypes: true }))
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);
    for (const source of sources) {
        const sourcePath = [DIRECTORY, source].join("/");
        const titles = (await fsp.readdir(sourcePath, { withFileTypes: true }))
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name);
        for (const title of titles) {
            const titlePath = [sourcePath, title].join("/");
            const files = await fsp.readdir(titlePath);
            const stats = await fsp.stat(titlePath);
            // birthtime is 0 where the file system doesn't record it
            const created = stats.birthtimeMs || stats.mtimeMs;
            const vids = files
                .filter(isVideo)
                .sort((a, b) =>
                    a.localeCompare(b, undefined, { numeric: true })
                );
            folders.push({ source, title, vids, created });
            if (vids.length && !files.includes("tn.png"))
                queueThumbnail(source, title, vids[0]);
        }
    }
    return folders;
};

/**
 * pairs new folders with the entries they were renamed or moved from: old
 * entries with exactly the same video file names. a pair only counts if
 * no other new folder or old entry has those names too, since titles that
 * share names like 1.mp4 can't be told apart.
 */
const matchMoved = (added: Folder[], old: Video[]) => {
    const groups = new Map<string, { added: Folder[]; old: Video[] }>();
    const group = (vids: string[]) => {
        const key = JSON.stringify(vids);
        if (!groups.has(key)) groups.set(key, { added: [], old: [] });
        return groups.get(key)!;
    };
    for (const folder of added) group(folder.vids).added.push(folder);
    for (const video of old) {
        if (video.vids.length) group(video.vids).old.push(video);
    }
    const moved = new Map<Folder, Video>();
    for (const { added, old } of groups.values()) {
        if (added.length === 1 && old.length === 1) moved.set(added[0], old[0]);
    }
    return moved;
};

/**
 * updates the database from a scan: refreshes the videos of known titles,
 * adds new ones (keeping the id, counter and tags of a title that was
 * renamed or moved) and prunes titles whose folder is gone.
 */
const applyScan = (folders: Folder[]) => {
    const now = Date.now();
    for (const [id, { at }] of pruned) {
        if (now - at > PRUNE_GRACE) pruned.delete(id);
    }
    const byPath = new Map(
        Object.values(database).map((x) => [x.source + "/" + x.title, x])
    );
    const found = new Set<string>();
    const added: Folder[] = [];
    for (const folder of folders) {
        const video = byPath.get(folder.source + "/" + folder.title);
        if (video) {
            // existing title: refresh its videos, keeping counter and tags
            video.vids = folder.vids;
            // saved before titles had a date
            video.added ??= folder.created;
            found.add(video.id);
        } else if (folder.vids.length) {
            added.push(folder);
        }
    }
    const missing = Object.values(database).filter((x) => !found.has(x.id));
    const recent = Array.from(pruned.values(), (x) => x.video);
    const moved = matchMoved(added, [...missing, ...recent]);
    for (const folder of added) {
        const { source, title, vids, created } = folder;
        const old = moved.get(folder);
        if (old) {
            log.info(`${old.source}/${old.title} moved to ${source}/${title}`);
            database[old.id] = {
                ...old,
                source,
                title,
                vids,
                // keeps the date it was first added
                added: old.added ?? created,
            };
            pruned.delete(old.id);
            found.add(old.id);
            continue;
        }
        const id = nanoid(12);
        database[id] = {
            id,
            title,
            source,
            counter: 0,
            tags: [],
            vids,
            added: created,
        };
    }
    for (const video of missing) {
        if (found.has(video.id)) continue;
        delete database[video.id];
        pruned.set(video.id, { video, at: now });
    }
};

let scanning: Promise<void> | undefined;
let scanAgain = false;

/**
 * scans DIRECTORY, updates the database and saves it.
 * scans don't overlap: calls made while one is running are combined into one
 * more scan, so an older scan can't undo what a newer one found.
 * never rejects: errors are logged so a failed scan can't crash the server,
 * and nothing is pruned after a failed scan.
 */
export const updateDatabase = (): Promise<void> => {
    if (scanning) {
        scanAgain = true;
        return scanning;
    }
    scanning = (async () => {
        do {
            scanAgain = false;
            try {
                applyScan(await scanDirectory());
                if (await saveDatabase()) log.info("database updated");
            } catch (error) {
                log.error("updateDatabase", error);
            }
        } while (scanAgain);
        scanning = undefined;
    })();
    return scanning;
};

/** how often to check that the watcher works, and to scan without one. */
const SCAN_INTERVAL = 60 * 1000;
/** how often to scan anyway while watching, in case a change was missed. */
const SCAN_FALLBACK = 10 * 60 * 1000;
/** wait after the last change before scanning, so a file being copied can
 * finish first (and the scan isn't run once per file). */
export const WATCH_DELAY = 2000;

/**
 * whether a change to this file (relative to DIRECTORY) can't change the
 * database: thumbnails, and the database itself if it is kept in DIRECTORY.
 * without this, saving after a scan would start the next scan.
 */
const ignored = (file: string) => {
    if (path.basename(file) === "tn.png") return true;
    const changed = path.resolve(DIRECTORY, file);
    const db = path.resolve(DB_FILE);
    return changed === db || changed === db + ".tmp";
};

/**
 * scans DIRECTORY now, and again whenever something in it changes. the
 * folder is watched with fs.watch; when that isn't possible (e.g. DIRECTORY
 * doesn't exist yet, or a network drive doesn't report changes), it is
 * scanned every minute instead, and while watching every 10 minutes in case
 * a change was missed.
 * returns a function that stops watching and scanning.
 */
export const startScanning = () => {
    let watcher: fs.FSWatcher | undefined;
    let delay: NodeJS.Timeout | undefined;
    let lastScan = 0;
    let warned = false;

    const scan = () => {
        lastScan = Date.now();
        return updateDatabase();
    };

    const watch = () => {
        try {
            watcher = fs.watch(
                DIRECTORY,
                { recursive: true },
                (event, file) => {
                    if (file && ignored(file)) return;
                    // the database only depends on names, so only "rename"
                    // (created, deleted or moved) starts a scan. "change" (e.g. a
                    // file being copied, or a folder whose files changed) only
                    // puts off a scan that is waiting, until the copy is done
                    if (event !== "rename" && !delay) return;
                    clearTimeout(delay);
                    delay = setTimeout(() => {
                        delay = undefined;
                        void scan();
                    }, WATCH_DELAY);
                }
            );
        } catch (error) {
            // logged once, not every minute, until watching works again
            if (!warned) {
                log.error(
                    `can't watch ${DIRECTORY}, scanning every minute`,
                    error
                );
            }
            warned = true;
            return;
        }
        watcher.on("error", (error) => {
            // e.g. DIRECTORY was deleted. try again on the next interval
            log.error(`stopped watching ${DIRECTORY}`, error);
            watcher?.close();
            watcher = undefined;
        });
        if (warned) log.info(`watching ${DIRECTORY} for changes`);
        warned = false;
    };

    watch();
    void scan();
    const interval = setInterval(() => {
        // without a watcher, scan every time: also when watching has just
        // started again, since changes made meanwhile weren't seen
        const watching = watcher !== undefined;
        if (!watching) watch();
        if (!watching || Date.now() - lastScan >= SCAN_FALLBACK) void scan();
    }, SCAN_INTERVAL);
    return () => {
        clearInterval(interval);
        clearTimeout(delay);
        watcher?.close();
        watcher = undefined;
    };
};
