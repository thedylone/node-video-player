import request from "supertest";
import { beforeEach, describe, expect, test } from "vitest";
import { loadServer, readDatabase, TestServer } from "../test-server";

let server: TestServer;
let id: string;

beforeEach(async () => {
    server = await loadServer({
        files: { "s/Heat/1.mp4": "", "s/Ronin/1.mp4": "" },
    });
    await server.updateDatabase();
    id = server.byTitle("Heat").id;
    server.byTitle("Heat").tags = ["crime"];
});

const tags = () => server.database[id].tags;

// P1-05
describe("POST /api/tag", () => {
    test("adds a trimmed tag and saves it", async () => {
        await request(server.app)
            .post("/api/tag")
            .send({ id, tag: "  heist " })
            .expect(200);
        expect(tags()).toEqual(["crime", "heist"]);
        expect((await readDatabase(server.dbFile))[id].tags).toEqual([
            "crime",
            "heist",
        ]);
    });

    test("adding an existing tag does nothing", async () => {
        await request(server.app)
            .post("/api/tag")
            .send({ id, tag: "crime" })
            .expect(200);
        expect(tags()).toEqual(["crime"]);
    });

    test.each([
        ["missing", {}],
        ["empty", { tag: "" }],
        ["blank", { tag: "   " }],
        ["a number", { tag: 5 }],
        ["null", { tag: null }],
    ])("a %s tag is a 400", async (_, body) => {
        const res = await request(server.app)
            .post("/api/tag")
            .send({ id, ...body })
            .expect(400);
        expect(res.body.error).toMatch(/tag/);
        expect(tags()).toEqual(["crime"]);
    });

    test("search still works after a rejected tag", async () => {
        await request(server.app).post("/api/tag").send({ id }).expect(400);
        const res = await request(server.app)
            .get("/api/videos?search=ron")
            .expect(200);
        expect(res.body.map((x: { title: string }) => x.title)).toEqual([
            "Ronin",
        ]);
    });

    test("an unknown id is a 404, a missing one a 400", async () => {
        await request(server.app)
            .post("/api/tag")
            .send({ id: "nope", tag: "x" })
            .expect(404);
        await request(server.app)
            .post("/api/tag")
            .send({ tag: "x" })
            .expect(400);
    });
});

describe("DELETE /api/tag", () => {
    test("removes the tag", async () => {
        await request(server.app)
            .delete("/api/tag")
            .send({ id, tag: "crime" })
            .expect(200);
        expect(tags()).toEqual([]);
    });

    test("removing a missing tag does nothing", async () => {
        await request(server.app)
            .delete("/api/tag")
            .send({ id, tag: "other" })
            .expect(200);
        expect(tags()).toEqual(["crime"]);
    });

    test("an empty tag can be removed", async () => {
        server.database[id].tags = ["", "crime"];
        await request(server.app)
            .delete("/api/tag")
            .send({ id, tag: "" })
            .expect(200);
        expect(tags()).toEqual(["crime"]);
    });

    test("a tag that isn't a string is a 400", async () => {
        await request(server.app)
            .delete("/api/tag")
            .send({ id, tag: 5 })
            .expect(400);
    });
});

describe("POST /api/tags", () => {
    test("replaces the tags, trimming and dropping empty and duplicate ones", async () => {
        await request(server.app)
            .post("/api/tags")
            .send({ id, tags: [" a", "b", "", "  ", "a ", "c"] })
            .expect(200);
        expect(tags()).toEqual(["a", "b", "c"]);
    });

    test.each([
        ["a string", "a,b"],
        ["missing", undefined],
        ["an object", { 0: "a" }],
        ["an array with a number", ["a", 5]],
        ["an array with null", ["a", null]],
    ])("tags as %s is a 400", async (_, value) => {
        const res = await request(server.app)
            .post("/api/tags")
            .send({ id, tags: value })
            .expect(400);
        expect(res.body.error).toMatch(/tags/);
        expect(tags()).toEqual(["crime"]);
    });

    test("an unknown id is a 404", async () => {
        await request(server.app)
            .post("/api/tags")
            .send({ id: "nope", tags: [] })
            .expect(404);
    });
});

// P5-02
describe("GET /api/tags", () => {
    test("lists every tag once, the most used first, then by name", async () => {
        server.byTitle("Heat").tags = ["crime", "la", "mann"];
        server.byTitle("Ronin").tags = ["paris", "mann", "car chase"];
        const res = await request(server.app).get("/api/tags").expect(200);
        expect(res.body).toEqual(["mann", "car chase", "crime", "la", "paris"]);
    });

    test("is empty without tags", async () => {
        server.byTitle("Heat").tags = [];
        const res = await request(server.app).get("/api/tags").expect(200);
        expect(res.body).toEqual([]);
    });
});
