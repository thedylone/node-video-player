import * as fs from "fs";
import * as path from "path";
import { afterEach, describe, expect, test, vi } from "vitest";
import { loadServer, readDatabase, TestServer } from "./test-server";

afterEach(() => {
    vi.useRealTimers();
});

const titles = (server: TestServer) =>
    Object.values(server.database)
        .map((x) => `${x.source}/${x.title}`)
        .sort();

/** gives the title a count and a tag, as if it had been watched. */
const use = (server: TestServer, title: string) => {
    const video = server.byTitle(title);
    video.counter = 7;
    video.tags = ["kept"];
    return video.id;
};

const move = (server: TestServer, from: string, to: string) => {
    fs.mkdirSync(path.dirname(path.join(server.directory, to)), {
        recursive: true,
    });
    fs.renameSync(
        path.join(server.directory, from),
        path.join(server.directory, to)
    );
};

describe("scan", () => {
    test("adds each title folder that has videos", async () => {
        const server = await loadServer({
            files: {
                "a/one/1.mp4": "",
                "a/two/x.mp4": "",
                "b/three/y.mp4": "",
                "b/empty/notes.txt": "",
            },
        });
        await server.updateDatabase();
        expect(titles(server)).toEqual(["a/one", "a/two", "b/three"]);
        expect(server.byTitle("one")).toMatchObject({
            source: "a",
            counter: 0,
            tags: [],
            vids: ["1.mp4"],
        });
        expect(server.log.info).toHaveBeenCalledWith("database updated");
    });

    test("lists only video files, in natural order", async () => {
        const server = await loadServer({
            files: {
                "s/t/10.mp4": "",
                "s/t/2.mp4": "",
                "s/t/1.mp4": "",
                "s/t/tn.png": "",
                "s/t/notes.txt": "",
            },
        });
        await server.updateDatabase();
        expect(server.byTitle("t").vids).toEqual(["1.mp4", "2.mp4", "10.mp4"]);
    });

    // P5-01
    test("lists other video formats, ignoring the case of extensions", async () => {
        const server = await loadServer({
            files: {
                "s/t/a.webm": "",
                "s/t/b.mkv": "",
                "s/t/c.mov": "",
                "s/t/d.m4v": "",
                "s/t/e.MP4": "",
                "s/t/f.Mov": "",
                "s/t/g.avi": "",
                "s/t/mp4": "",
            },
        });
        await server.updateDatabase();
        expect(server.byTitle("t").vids).toEqual([
            "a.webm",
            "b.mkv",
            "c.mov",
            "d.m4v",
            "e.MP4",
            "f.Mov",
        ]);
    });

    // P5-01
    test("adds a title that has only other formats", async () => {
        const server = await loadServer({ files: { "s/t/1.webm": "" } });
        await server.updateDatabase();
        expect(server.byTitle("t").vids).toEqual(["1.webm"]);
    });

    // P1-03
    test("ignores files where folders are expected", async () => {
        const server = await loadServer({
            files: {
                ".DS_Store": "",
                "s/stray.mp4": "",
                "s/t/1.mp4": "",
            },
        });
        await server.updateDatabase();
        expect(titles(server)).toEqual(["s/t"]);
        expect(server.log.error).not.toHaveBeenCalled();
    });

    // P1-03
    test("logs a missing DIRECTORY and prunes nothing", async () => {
        const server = await loadServer({ files: { "s/t/1.mp4": "" } });
        await server.updateDatabase();
        fs.rmSync(server.directory, { recursive: true });
        await server.updateDatabase();
        expect(titles(server)).toEqual(["s/t"]);
        expect(server.log.error).toHaveBeenCalledWith(
            "updateDatabase",
            expect.objectContaining({ code: "ENOENT" })
        );
    });

    // P1-03
    test("logs a failed save without rejecting", async () => {
        const server = await loadServer({ files: { "s/t/1.mp4": "" } });
        fs.mkdirSync(server.dbFile);
        await expect(server.updateDatabase()).resolves.toBeUndefined();
        expect(server.log.error).toHaveBeenCalledWith(
            "saveDatabase",
            expect.anything()
        );
        expect(server.log.info).not.toHaveBeenCalledWith("database updated");
    });

    // P1-04
    test("updates the videos of a known title, keeping counter and tags", async () => {
        const server = await loadServer({ files: { "s/t/a.mp4": "" } });
        await server.updateDatabase();
        const id = use(server, "t");
        fs.writeFileSync(path.join(server.directory, "s/t/b.mp4"), "");
        await server.updateDatabase();
        expect(server.database[id]).toMatchObject({
            vids: ["a.mp4", "b.mp4"],
            counter: 7,
            tags: ["kept"],
        });
        expect((await readDatabase(server.dbFile))[id].vids).toEqual([
            "a.mp4",
            "b.mp4",
        ]);
    });

    test("keeps a known title whose videos are all removed", async () => {
        const server = await loadServer({ files: { "s/t/a.mp4": "" } });
        await server.updateDatabase();
        const id = use(server, "t");
        fs.rmSync(path.join(server.directory, "s/t/a.mp4"));
        await server.updateDatabase();
        expect(server.database[id]).toMatchObject({ vids: [], counter: 7 });
    });

    test("prunes titles whose folder is gone", async () => {
        const server = await loadServer({
            files: { "s/t/1.mp4": "", "s/u/1.mp4": "" },
        });
        await server.updateDatabase();
        fs.rmSync(path.join(server.directory, "s/t"), { recursive: true });
        await server.updateDatabase();
        expect(titles(server)).toEqual(["s/u"]);
        expect(Object.keys(await readDatabase(server.dbFile))).toHaveLength(1);
    });
});

// P3-03
describe("renamed and moved folders", () => {
    test("a renamed title keeps its id, counter and tags", async () => {
        const server = await loadServer({
            files: { "s/old/a.mp4": "", "s/old/b.mp4": "" },
        });
        await server.updateDatabase();
        const id = use(server, "old");
        move(server, "s/old", "s/new");
        await server.updateDatabase();
        expect(titles(server)).toEqual(["s/new"]);
        expect(server.database[id]).toMatchObject({
            title: "new",
            source: "s",
            counter: 7,
            tags: ["kept"],
        });
    });

    test("a title moved to another source keeps its id", async () => {
        const server = await loadServer({ files: { "s/t/a.mp4": "" } });
        await server.updateDatabase();
        const id = use(server, "t");
        move(server, "s/t", "other/t");
        await server.updateDatabase();
        expect(server.database[id]).toMatchObject({
            source: "other",
            counter: 7,
        });
    });

    test("an untouched title with the same file names doesn't count", async () => {
        const server = await loadServer({
            files: { "s/old/1.mp4": "", "s/same/1.mp4": "" },
        });
        await server.updateDatabase();
        const id = use(server, "old");
        const sameId = server.byTitle("same").id;
        move(server, "s/old", "s/new");
        await server.updateDatabase();
        expect(server.database[id]).toMatchObject({ title: "new", counter: 7 });
        expect(server.database[sameId].title).toBe("same");
    });

    test("titles that can't be told apart start over", async () => {
        const server = await loadServer({
            files: { "s/a/1.mp4": "", "s/b/1.mp4": "" },
        });
        await server.updateDatabase();
        use(server, "a");
        use(server, "b");
        move(server, "s/a", "s/c");
        move(server, "s/b", "s/d");
        await server.updateDatabase();
        expect(titles(server)).toEqual(["s/c", "s/d"]);
        expect(server.byTitle("c").counter).toBe(0);
        expect(server.byTitle("d").counter).toBe(0);
    });

    test("a folder that comes back within 10 minutes keeps its id", async () => {
        vi.useFakeTimers({ toFake: ["Date"] });
        const server = await loadServer({ files: { "s/t/a.mp4": "" } });
        await server.updateDatabase();
        const id = use(server, "t");
        move(server, "s/t", "../away");
        await server.updateDatabase();
        expect(titles(server)).toEqual([]);
        vi.setSystemTime(Date.now() + 9 * 60 * 1000);
        move(server, "../away", "s/back");
        await server.updateDatabase();
        expect(server.database[id]).toMatchObject({
            title: "back",
            counter: 7,
        });
    });

    test("a folder that comes back later starts over", async () => {
        vi.useFakeTimers({ toFake: ["Date"] });
        const server = await loadServer({ files: { "s/t/a.mp4": "" } });
        await server.updateDatabase();
        const id = use(server, "t");
        move(server, "s/t", "../away");
        await server.updateDatabase();
        vi.setSystemTime(Date.now() + 11 * 60 * 1000);
        // a scan after the grace period forgets the pruned title
        await server.updateDatabase();
        move(server, "../away", "s/t");
        await server.updateDatabase();
        expect(server.database[id]).toBeUndefined();
        expect(server.byTitle("t").counter).toBe(0);
    });
});
