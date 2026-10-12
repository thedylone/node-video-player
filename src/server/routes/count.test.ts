import request from "supertest";
import { beforeEach, describe, expect, test } from "vitest";
import { loadServer, readDatabase, TestServer } from "../test-server";

let server: TestServer;
let id: string;

beforeEach(async () => {
    server = await loadServer({ files: { "s/t/1.mp4": "" } });
    await server.updateDatabase();
    id = server.byTitle("t").id;
});

const post = (body: object) =>
    request(server.app).post("/api/count").send(body);

// P1-05
describe("POST /api/count", () => {
    test("adds num and returns the new counter as JSON", async () => {
        const res = await post({ id, num: 3 }).expect(200);
        expect(res.headers["content-type"]).toMatch(/^application\/json/);
        expect(res.body).toBe(3);
        expect((await post({ id, num: -5 }).expect(200)).body).toBe(-2);
        expect((await readDatabase(server.dbFile))[id].counter).toBe(-2);
    });

    test("accepts an integer as a string", async () => {
        expect((await post({ id, num: "2" }).expect(200)).body).toBe(2);
    });

    test("accepts a form-encoded body", async () => {
        const res = await request(server.app)
            .post("/api/count")
            .type("form")
            .send({ id, num: "1" })
            .expect(200);
        expect(res.body).toBe(1);
    });

    test.each([
        ["missing", undefined],
        ["a word", "abc"],
        ["blank", " "],
        ["a fraction", 1.5],
        ["null", null],
        ["a boolean", true],
        ["an array", [1]],
    ])("num as %s is a 400", async (_, num) => {
        const res = await post({ id, num }).expect(400);
        expect(res.body).toEqual({ error: "num must be an integer" });
        expect(server.database[id].counter).toBe(0);
    });

    test("an unknown id is a 404", async () => {
        await post({ id: "nope", num: 1 }).expect(404);
    });

    // P1-05: this used to add a counter to every object
    test("__proto__ is a 404 and changes nothing", async () => {
        await post({ id: "__proto__", num: 1 }).expect(404);
        expect(({} as { counter?: number }).counter).toBeUndefined();
    });
});
