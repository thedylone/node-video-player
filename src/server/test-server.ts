/**
 * helpers for server tests. not imported by the server itself.
 */
import * as fsp from "fs/promises";
import * as os from "os";
import * as path from "path";
import { afterEach, vi } from "vitest";
import { Video } from "../shared/schema";

/** file contents by path, relative to the videos folder. */
export type Files = { [path: string]: string };

/** creates the given files (and their folders) under root. */
export const writeFiles = async (root: string, files: Files) => {
    for (const [file, contents] of Object.entries(files)) {
        const filePath = path.join(root, file);
        await fsp.mkdir(path.dirname(filePath), { recursive: true });
        await fsp.writeFile(filePath, contents);
    }
};

/** reads the database file as saved on disk. */
export const readDatabase = async (
    dbFile: string
): Promise<{ [id: string]: Video }> =>
    JSON.parse(await fsp.readFile(dbFile, "utf8"));

const tempDirs: string[] = [];

afterEach(async () => {
    vi.unstubAllEnvs();
    for (const dir of tempDirs.splice(0)) {
        // retry: on Windows a stream that is still closing can keep a file open
        await fsp.rm(dir, { recursive: true, force: true, maxRetries: 5 });
    }
});

type Options = {
    /** files to create in DIRECTORY before the server loads. */
    files?: Files;
    /** contents of DB_FILE (a string is written as is). none if undefined. */
    db?: { [id: string]: unknown } | string;
    /** sets FFMPEG_PATH and FFPROBE_PATH, so thumbnails are queued. */
    ffmpeg?: boolean;
};

/**
 * loads a fresh copy of the server modules against a new temporary DIRECTORY
 * and DB_FILE. config and the database are read when the modules load, so
 * every call imports new copies. log output is silenced and recorded.
 * the temporary folder is deleted after the test.
 */
export const loadServer = async ({ files = {}, db, ffmpeg }: Options = {}) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "video-player-"));
    tempDirs.push(dir);
    const directory = path.join(dir, "videos");
    const dbFile = path.join(dir, "db.json");
    await fsp.mkdir(directory);
    await writeFiles(directory, files);
    if (db !== undefined) {
        const contents = typeof db === "string" ? db : JSON.stringify(db);
        await fsp.writeFile(dbFile, contents);
    }
    // set, even if empty, so the developer's .env can't override them
    vi.stubEnv("DIRECTORY", directory);
    vi.stubEnv("DB_FILE", dbFile);
    vi.stubEnv("FFMPEG_PATH", ffmpeg ? "ffmpeg" : "");
    vi.stubEnv("FFPROBE_PATH", ffmpeg ? "ffprobe" : "");

    vi.resetModules();
    const { log } = await import("./log");
    const info = vi.spyOn(log, "info").mockImplementation(() => {});
    const error = vi.spyOn(log, "error").mockImplementation(() => {});
    const { app, start } = await import("./app");
    const dbModule = await import("./db");
    const { updateDatabase } = await import("./scan");
    const { clearThumbnailQueue } = await import("./ffmpeg");
    return {
        dir,
        directory,
        dbFile,
        app,
        start,
        updateDatabase,
        clearThumbnailQueue,
        database: dbModule.database,
        saveDatabase: dbModule.saveDatabase,
        log: { info, error },
        /** the only title in the database with this title folder name. */
        byTitle: (title: string) => {
            const found = Object.values(dbModule.database).filter(
                (x) => x.title === title
            );
            if (found.length !== 1)
                throw new Error(`${found.length} titles named ${title}`);
            return found[0];
        },
    };
};

export type TestServer = Awaited<ReturnType<typeof loadServer>>;
