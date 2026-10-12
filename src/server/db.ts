import * as fs from "fs";
import * as fsp from "fs/promises";
import jsonfile from "jsonfile";
import { Video } from "../shared/schema";
import { DB_FILE, DIRECTORY } from "./config";
import { log } from "./log";

const loadDatabase = (): { [key: string]: Video } => {
    if (!fs.existsSync(DB_FILE)) {
        log.info(DB_FILE + " not found: starting with empty database");
        return {};
    }
    const db: { [key: string]: Video } = jsonfile.readFileSync(DB_FILE);
    // drop empty or non-string tags saved before tags were validated
    for (const video of Object.values(db)) {
        video.tags = (video.tags ?? []).filter(
            (tag) => typeof tag === "string" && tag.trim()
        );
    }
    return db;
};

/** every title, by id. loaded once and changed in place, never reassigned. */
export const database = loadDatabase();

let saving: Promise<boolean> | undefined;
let saveAgain = false;

/**
 * writes the database to DB_FILE. it is written to a temporary file and then
 * renamed, so a crash mid-write can't corrupt DB_FILE.
 * calls made while a save is running are combined into one more save.
 * never rejects: resolves to false (and logs the error) if the write failed.
 */
export const saveDatabase = (): Promise<boolean> => {
    if (saving) {
        saveAgain = true;
        return saving;
    }
    saving = (async () => {
        let ok: boolean;
        do {
            saveAgain = false;
            try {
                await jsonfile.writeFile(DB_FILE + ".tmp", database);
                await fsp.rename(DB_FILE + ".tmp", DB_FILE);
                ok = true;
            } catch (error) {
                log.error("saveDatabase", error);
                ok = false;
            }
        } while (saveAgain);
        saving = undefined;
        return ok;
    })();
    return saving;
};

/**
 * returns the video with this id, or undefined.
 * only own keys count, so ids like "__proto__" can't reach Object.prototype.
 */
export const getVideo = (id: unknown): Video | undefined => {
    if (typeof id !== "string") return undefined;
    if (!Object.prototype.hasOwnProperty.call(database, id)) return undefined;
    return database[id];
};

/**
 * returns the videos whose title or a tag contains search (lowercase),
 * optionally only those from the given sources.
 */
export const getVideos = (search: string, filter?: string[]) => {
    const videos: Video[] = [];
    for (const video of Object.values(database)) {
        if (filter && !filter.includes(video.source)) continue;
        if (
            !video.title.toLowerCase().includes(search) &&
            !video.tags.some(
                (x) => typeof x === "string" && x.toLowerCase().includes(search)
            )
        )
            continue;
        videos.push(video);
    }
    return videos;
};

/** adds num to the video's counter and returns the new counter. */
export async function addCount(video: Video, num: number): Promise<number> {
    video.counter += num;
    await saveDatabase();
    return video.counter;
}

/**
 * deletes the title's folder from disk and its entry from the database.
 * rejects if the folder can't be deleted, in which case the entry is kept.
 */
export async function deleteTitle(video: Video): Promise<void> {
    const { id, source, title } = video;
    await fsp.rm([DIRECTORY, source, title].join("/"), {
        recursive: true,
        force: true,
    });
    delete database[id];
    log.info(`deleted ${source}/${title}`);
    await saveDatabase();
}

/** replaces the video's tags. */
export async function updateTags(video: Video, tags: string[]): Promise<void> {
    video.tags = tags;
    await saveDatabase();
}
