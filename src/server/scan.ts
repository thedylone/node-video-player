import * as fsp from "fs/promises";
import { nanoid } from "nanoid";
import { DIRECTORY } from "./config";
import { database, saveDatabase } from "./db";
import { ffmpegExists, generateThumbnail } from "./ffmpeg";

const addDirToDatabase = async () => {
    const exists = [];
    const current = new Map(
        Object.values(database).map((x) => [x.source + "/" + x.title, x.id])
    );
    const sources = (await fsp.readdir(DIRECTORY, { withFileTypes: true }))
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);
    for (const source of sources) {
        const sourcePath = [DIRECTORY, source].join("/");
        const titles = (await fsp.readdir(sourcePath, { withFileTypes: true }))
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name);
        for (const title of titles) {
            exists.push([source, title].join("/"));
            const titlePath = [sourcePath, title].join("/");
            const files = await fsp.readdir(titlePath);
            const vids = files
                .filter((x) => x.endsWith(".mp4"))
                .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
            // existing title: refresh its videos, keeping counter and tags
            const currentId = current.get([source, title].join("/"));
            if (currentId) database[currentId].vids = vids;
            if (!vids.length) continue;
            if (files.length == vids.length && ffmpegExists)
                generateThumbnail(source, title, vids[0]);
            if (currentId) continue;
            const id = nanoid(12);
            database[id] = {
                id: id,
                title: title,
                source: source,
                counter: 0,
                tags: [],
                vids: vids,
            };
        }
    }
    return exists;
};

const pruneDatabase = (exists: string[]) => {
    if (!exists) return;
    for (const id in database) {
        if (!exists.includes(database[id].source + "/" + database[id].title)) {
            delete database[id];
        }
    }
};

/**
 * scans DIRECTORY, prunes missing titles and saves the database.
 * never rejects: errors are logged so a failed scan can't crash the server.
 */
export const updateDatabase = async () => {
    try {
        const exists = await addDirToDatabase();
        pruneDatabase(exists);
        if (await saveDatabase()) process.stdout.write("database updated\n");
    } catch (error) {
        process.stderr.write("updateDatabase: " + error + "\n");
    }
};
