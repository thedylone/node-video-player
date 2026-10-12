import * as fs from "fs";
import request from "supertest";
import { describe, expect, test } from "vitest";
import { loadServer, readDatabase } from "./test-server";

const video = (id: string, extra: object = {}) => ({
    id,
    title: id,
    source: "source",
    counter: 0,
    tags: [],
    vids: ["1.mp4"],
    ...extra,
});

describe("loading", () => {
    // P1-01
    test("starts empty without DB_FILE and creates it on the first save", async () => {
        const server = await loadServer({
            files: { "source/title/1.mp4": "" },
        });
        expect(server.database).toEqual({});
        expect(fs.existsSync(server.dbFile)).toBe(false);
        await server.updateDatabase();
        const saved = await readDatabase(server.dbFile);
        expect(Object.values(saved).map((x) => x.title)).toEqual(["title"]);
    });

    test("loads DB_FILE", async () => {
        const server = await loadServer({
            db: { a: video("a", { counter: 3, tags: ["x"] }) },
        });
        expect(server.database.a).toMatchObject({ counter: 3, tags: ["x"] });
    });

    // P1-05: the old code saved missing tags as null, which broke search
    test("drops empty and non-string tags", async () => {
        const server = await loadServer({
            db: {
                a: video("a", { tags: ["ok", null, "", "  ", 5] }),
                b: video("b", { tags: undefined }),
            },
        });
        expect(server.database.a.tags).toEqual(["ok"]);
        expect(server.database.b.tags).toEqual([]);
    });

    test("refuses to load a corrupt DB_FILE, so it isn't overwritten", async () => {
        await expect(loadServer({ db: "{ not json" })).rejects.toThrow();
    });
});

// P1-09
describe("saving", () => {
    test("saves each change before responding, without a temp file", async () => {
        const server = await loadServer({ db: { a: video("a") } });
        await request(server.app)
            .post("/api/tag")
            .send({ id: "a", tag: "new" })
            .expect(200);
        expect((await readDatabase(server.dbFile)).a.tags).toEqual(["new"]);
        expect(fs.existsSync(server.dbFile + ".tmp")).toBe(false);
    });

    test("keeps every change when many arrive at once", async () => {
        const server = await loadServer({ db: { a: video("a") } });
        await Promise.all(
            Array.from({ length: 20 }, () =>
                request(server.app)
                    .post("/api/count")
                    .send({ id: "a", num: 1 })
                    .expect(200)
            )
        );
        expect((await readDatabase(server.dbFile)).a.counter).toBe(20);
    });

    test("resolves to false and logs when the file can't be written", async () => {
        const server = await loadServer({ db: { a: video("a") } });
        // a folder where the file should be makes the rename fail
        fs.rmSync(server.dbFile);
        fs.mkdirSync(server.dbFile);
        expect(await server.saveDatabase()).toBe(false);
        expect(server.log.error).toHaveBeenCalledWith(
            "saveDatabase",
            expect.anything()
        );
    });
});
