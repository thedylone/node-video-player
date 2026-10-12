import * as fs from "fs";
import * as fsp from "fs/promises";
import jsonfile from "jsonfile";
import { Video } from "../shared/schema";
import { DB_FILE, DIRECTORY } from "./config";

const loadDatabase = (): { [key: string]: Video } => {
    if (!fs.existsSync(DB_FILE)) {
        process.stdout.write(DB_FILE + " not found: starting with empty database\n");
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
                process.stderr.write("saveDatabase: " + error + "\n");
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

export async function addCount(id: string, num: number): Promise<number> {
    if (!getVideo(id)) {
        process.stderr.write("addCount: id not found\n");
        return -1;
    }
    const counter = (database[id].counter += num);
    await saveDatabase();
    return counter;
}

/**
 * deletes the title's folder from disk and its entry from the database.
 * the id must exist. rejects if the folder can't be deleted, in which case
 * the entry is kept.
 */
export async function deleteTitle(id: string): Promise<void> {
    const { source, title } = database[id];
    await fsp.rm([DIRECTORY, source, title].join("/"), {
        recursive: true,
        force: true,
    });
    delete database[id];
    process.stdout.write("delete complete\n");
    await saveDatabase();
}

export async function updateTags(id: string, tags: string[]): Promise<boolean> {
    if (!getVideo(id)) {
        process.stderr.write("updateTags: id not found\n");
        return false;
    }
    database[id].tags = tags;
    await saveDatabase();
    return true;
}
