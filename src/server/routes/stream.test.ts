import * as fs from "fs";
import * as path from "path";
import request from "supertest";
import { beforeEach, describe, expect, test } from "vitest";
import { loadServer, TestServer } from "../test-server";

// P1-08
describe("GET /api/stream/:id", () => {
    // 1000 bytes that don't repeat within any range tested
    const contents = Buffer.from(
        Array.from({ length: 1000 }, (_, i) => i % 251)
    );
    let server: TestServer;
    let id: string;

    beforeEach(async () => {
        server = await loadServer({
            files: { "s/t/1.mp4": "", "s/t/2.mp4": "second" },
        });
        fs.writeFileSync(path.join(server.directory, "s/t/1.mp4"), contents);
        await server.updateDatabase();
        id = server.byTitle("t").id;
    });

    /** requests the stream with a Range header (if given) as raw bytes. */
    const get = (query = "", range?: string) => {
        const req = request(server.app)
            .get(`/api/stream/${id}${query}`)
            .buffer(true)
            .parse((res, done) => {
                const chunks: Buffer[] = [];
                res.on("data", (chunk: Buffer) => chunks.push(chunk));
                res.on("end", () => done(null, Buffer.concat(chunks)));
            });
        return range ? req.set("Range", range) : req;
    };

    test("sends the whole file without a range", async () => {
        const res = await get().expect(200);
        expect(res.headers["content-type"]).toBe("video/mp4");
        expect(res.headers["accept-ranges"]).toBe("bytes");
        expect(res.headers["content-length"]).toBe("1000");
        expect(res.body).toEqual(contents);
    });

    test.each([
        ["bytes=0-99", 0, 99],
        ["bytes=500-500", 500, 500],
        // open-ended
        ["bytes=900-", 900, 999],
        // suffix: the last 500 bytes
        ["bytes=-500", 500, 999],
        // a suffix longer than the file is the whole file
        ["bytes=-5000", 0, 999],
        // end past the end of the file is capped
        ["bytes=990-5000", 990, 999],
    ])("%s sends bytes %i-%i", async (range, start, end) => {
        const res = await get("", range).expect(206);
        expect(res.headers["content-range"]).toBe(`bytes ${start}-${end}/1000`);
        expect(res.headers["content-length"]).toBe(String(end - start + 1));
        expect(res.body).toEqual(contents.subarray(start, end + 1));
    });

    test.each(["bytes=1000-", "bytes=5000-6000", "bytes=-0"])(
        "%s is not satisfiable",
        async (range) => {
            const res = await request(server.app)
                .get(`/api/stream/${id}`)
                .set("Range", range)
                .expect(416);
            expect(res.headers["content-range"]).toBe("bytes */1000");
        }
    );

    test.each(["bytes=abc", "bytes=0-1,5-6", "items=0-1", "bytes=10-5"])(
        "ignores the header %s and sends the whole file",
        async (range) => {
            const res = await get("", range).expect(200);
            expect(res.body).toEqual(contents);
        }
    );

    test("index picks the video", async () => {
        const res = await get("?index=1").expect(200);
        expect(res.body.toString()).toBe("second");
    });

    test.each(["abc", "-1", "1.5", ""])("index=%s is a 400", async (index) => {
        const res = await request(server.app)
            .get(`/api/stream/${id}?index=${index}`)
            .expect(400);
        expect(res.body.error).toMatch(/index/);
    });

    test("an index past the last video is a 404", async () => {
        await request(server.app).get(`/api/stream/${id}?index=2`).expect(404);
    });

    test("an unknown id is a 404", async () => {
        const res = await request(server.app)
            .get("/api/stream/nope")
            .expect(404);
        expect(res.body).toEqual({ error: "Not Found" });
    });

    test("a file deleted since the last scan is a 404", async () => {
        fs.rmSync(path.join(server.directory, "s/t/1.mp4"));
        await request(server.app).get(`/api/stream/${id}`).expect(404);
    });
});

// P5-01
describe("GET /api/stream/:id content types", () => {
    test.each([
        ["1.mp4", "video/mp4"],
        ["1.M4V", "video/mp4"],
        ["1.webm", "video/webm"],
        ["1.MKV", "video/x-matroska"],
        ["1.mov", "video/quicktime"],
    ])("%s is sent as %s", async (file, type) => {
        const server = await loadServer({ files: { ["s/t/" + file]: "x" } });
        await server.updateDatabase();
        const res = await request(server.app)
            .get(`/api/stream/${server.byTitle("t").id}`)
            .expect(200);
        expect(res.headers["content-type"]).toBe(type);
    });
});
