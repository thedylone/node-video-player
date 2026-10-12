import * as fsp from "fs/promises";
import { nanoid } from "nanoid";
import { Video } from "../shared/schema";
import { DIRECTORY } from "./config";
import { database, saveDatabase } from "./db";
import { queueThumbnail } from "./ffmpeg";
import { log } from "./log";

/** how long a pruned title can still be matched to a renamed folder. */
const PRUNE_GRACE = 10 * 60 * 1000;

/**
 * titles pruned in the last PRUNE_GRACE, by id. kept in memory only, so a
 * folder moved while a scan was running (and seen in neither place) still
 * keeps its counter and tags when the next scan finds it.
 */
const pruned = new Map<string, { video: Video; at: number }>();

type Folder = { source: string; title: string; vids: string[] };

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
            const vids = files
                .filter((x) => x.endsWith(".mp4"))
                .sort((a, b) =>
                    a.localeCompare(b, undefined, { numeric: true })
                );
            folders.push({ source, title, vids });
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
            found.add(video.id);
        } else if (folder.vids.length) {
            added.push(folder);
        }
    }
    const missing = Object.values(database).filter((x) => !found.has(x.id));
    const recent = Array.from(pruned.values(), (x) => x.video);
    const moved = matchMoved(added, [...missing, ...recent]);
    for (const folder of added) {
        const { source, title, vids } = folder;
        const old = moved.get(folder);
        if (old) {
            log.info(`${old.source}/${old.title} moved to ${source}/${title}`);
            database[old.id] = { ...old, source, title, vids };
            pruned.delete(old.id);
            found.add(old.id);
            continue;
        }
        const id = nanoid(12);
        database[id] = { id, title, source, counter: 0, tags: [], vids };
    }
    for (const video of missing) {
        if (found.has(video.id)) continue;
        delete database[video.id];
        pruned.set(video.id, { video, at: now });
    }
};

/**
 * scans DIRECTORY, updates the database and saves it.
 * never rejects: errors are logged so a failed scan can't crash the server,
 * and nothing is pruned after a failed scan.
 */
export const updateDatabase = async () => {
    try {
        applyScan(await scanDirectory());
        if (await saveDatabase()) log.info("database updated");
    } catch (error) {
        log.error("updateDatabase", error);
    }
};
