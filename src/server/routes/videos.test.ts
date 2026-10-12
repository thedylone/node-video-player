import * as fs from "fs";
import * as path from "path";
import request from "supertest";
import { beforeEach, describe, expect, test } from "vitest";
import { Video } from "../../shared/schema";
import { loadServer, readDatabase, TestServer } from "../test-server";

let server: TestServer;

beforeEach(async () => {
    server = await loadServer({
        files: {
            "anime/Cowboy Bebop/1.mp4": "",
            "anime/Mob Psycho/1.mp4": "",
            "anime/Mob Psycho/tn.png": "png",
            "films/Heat/heat.mp4": "",
            "shows/Bluey/1.mp4": "",
        },
    });
    await server.updateDatabase();
    server.byTitle("Heat").tags = ["Crime", "Mann"];
});

const titles = (videos: Video[]) => videos.map((x) => x.title).sort();

describe("GET /api/videos", () => {
    test("lists every title", async () => {
        const res = await request(server.app).get("/api/videos").expect(200);
        expect(titles(res.body)).toEqual([
            "Bluey",
            "Cowboy Bebop",
            "Heat",
            "Mob Psycho",
        ]);
    });

    test("searches titles and tags, ignoring case", async () => {
        const get = (search: string) =>
            request(server.app).get("/api/videos").query({ search });
        expect(titles((await get("MOB")).body)).toEqual(["Mob Psycho"]);
        expect(titles((await get("crime")).body)).toEqual(["Heat"]);
        expect(titles((await get("o")).body)).toEqual([
            "Cowboy Bebop",
            "Mob Psycho",
        ]);
    });

    test("filters by source, comma-separated or repeated", async () => {
        const comma = await request(server.app)
            .get("/api/videos?filter=films,shows")
            .expect(200);
        expect(titles(comma.body)).toEqual(["Bluey", "Heat"]);
        const repeated = await request(server.app)
            .get("/api/videos?filter=films&filter=shows&search=heat")
            .expect(200);
        expect(titles(repeated.body)).toEqual(["Heat"]);
    });
});

describe("GET /api/sources", () => {
    test("lists every source", async () => {
        const res = await request(server.app).get("/api/sources").expect(200);
        expect(res.body.sort()).toEqual(["anime", "films", "shows"]);
    });

    test("with a search, lists sources with matching titles", async () => {
        const res = await request(server.app)
            .get("/api/sources?search=mann")
            .expect(200);
        expect(res.body).toEqual(["films"]);
    });
});

describe("GET /api/videos/id/:id", () => {
    test("returns the title", async () => {
        const { id } = server.byTitle("Heat");
        const res = await request(server.app)
            .get(`/api/videos/id/${id}`)
            .expect(200);
        expect(res.body).toEqual({
            id,
            title: "Heat",
            source: "films",
            counter: 0,
            tags: ["Crime", "Mann"],
            vids: ["heat.mp4"],
        });
    });

    // P1-05: ids used to be looked up with database[id]
    test.each(["nope", "__proto__", "constructor", "hasOwnProperty"])(
        "%s is a 404",
        async (id) => {
            const res = await request(server.app)
                .get(`/api/videos/id/${id}`)
                .expect(404);
            expect(res.body).toEqual({ error: "Not Found" });
        }
    );
});

describe("DELETE /api/videos/id/:id", () => {
    test("deletes the folder from disk and the title from the database", async () => {
        const { id } = server.byTitle("Heat");
        await request(server.app).delete(`/api/videos/id/${id}`).expect(200);
        expect(fs.existsSync(path.join(server.directory, "films/Heat"))).toBe(
            false
        );
        expect(server.database[id]).toBeUndefined();
        expect((await readDatabase(server.dbFile))[id]).toBeUndefined();
        await request(server.app).get(`/api/videos/id/${id}`).expect(404);
    });

    test("an unknown id is a 404 and deletes nothing", async () => {
        await request(server.app).delete("/api/videos/id/nope").expect(404);
        expect(Object.keys(server.database)).toHaveLength(4);
    });
});

// P2-09: the temporary DIRECTORY is an absolute path
describe("GET /api/thumbnail/:id", () => {
    test("sends tn.png", async () => {
        const { id } = server.byTitle("Mob Psycho");
        const res = await request(server.app)
            .get(`/api/thumbnail/${id}`)
            .expect(200);
        expect(res.headers["content-type"]).toBe("image/png");
        expect(res.body.toString()).toBe("png");
    });

    test("a title without tn.png is a 404", async () => {
        const { id } = server.byTitle("Heat");
        const res = await request(server.app)
            .get(`/api/thumbnail/${id}`)
            .expect(404);
        expect(res.body).toEqual({ error: "Not Found" });
        expect(server.log.error).not.toHaveBeenCalled();
    });

    test("an unknown id is a 404", async () => {
        await request(server.app).get("/api/thumbnail/nope").expect(404);
    });
});
