import express from "express";
import request from "supertest";
import { describe, expect, test } from "vitest";
import { isLoopback, localHostsOnly } from "./access";
import { loadServer } from "./test-server";

// P5-03
describe("isLoopback", () => {
    test.each(["127.0.0.1", "127.1.2.3", "localhost", "a.localhost", "::1"])(
        "%s is loopback",
        (host) => expect(isLoopback(host)).toBe(true)
    );

    test.each([
        "0.0.0.0",
        "::",
        "192.168.1.5",
        "example.com",
        "127.0.0.1.nip.io",
    ])("%s is not loopback", (host) => expect(isLoopback(host)).toBe(false));
});

// P5-03
describe("localHostsOnly", () => {
    const app = express();
    app.use(localHostsOnly(["Videos.Example.com"]));
    app.get("/", (_, res) => {
        res.send("ok");
    });

    test.each([
        "localhost:3000",
        "localhost",
        "127.0.0.1:3000",
        "[::1]:3000",
        "videos.example.com",
        "VIDEOS.example.com:443",
    ])("allows Host: %s", async (host) => {
        await request(app).get("/").set("Host", host).expect(200, "ok");
    });

    test.each(["evil.example", "192.168.1.5:3000", "localhost.evil.example"])(
        "refuses Host: %s",
        async (host) => {
            await request(app).get("/").set("Host", host).expect(403);
        }
    );
});

// P5-03
describe("writes from other sites", () => {
    const setup = async () => {
        const server = await loadServer({ files: { "s/t/1.mp4": "" } });
        await server.updateDatabase();
        const video = server.byTitle("t");
        const post = (headers: { [name: string]: string }) =>
            request(server.app)
                .post("/api/count")
                .set("Host", "localhost:3000")
                .set(headers)
                .send({ id: video.id, num: 1 });
        return { video, post, server };
    };

    test("are refused, and change nothing", async () => {
        const { video, post } = await setup();
        const res = await post({ Origin: "http://evil.example" }).expect(403);
        expect(res.body).toEqual({
            error: "requests from other sites are not allowed",
        });
        await post({ Origin: "null" }).expect(403);
        // same name, different port: another site
        await post({ Origin: "http://localhost:4000" }).expect(403);
        expect(video.counter).toBe(0);
    });

    test("from the same site are allowed", async () => {
        const { video, post } = await setup();
        await post({ Origin: "http://localhost:3000" }).expect(200);
        expect(video.counter).toBe(1);
    });

    test("without an Origin (e.g. curl) are allowed", async () => {
        const { video, post } = await setup();
        await post({}).expect(200);
        expect(video.counter).toBe(1);
    });

    test("from the host a reverse proxy forwards are allowed", async () => {
        const { video, post } = await setup();
        await post({
            Origin: "https://videos.example.com",
            "X-Forwarded-Host": "videos.example.com",
        }).expect(200);
        expect(video.counter).toBe(1);
    });

    test("reading from another site isn't blocked", async () => {
        const { server } = await setup();
        await request(server.app)
            .get("/api/videos")
            .set("Origin", "http://evil.example")
            .expect(200);
    });

    test("deletes are checked too", async () => {
        const { video, server } = await setup();
        await request(server.app)
            .delete("/api/videos/id/" + video.id)
            .set("Host", "localhost:3000")
            .set("Origin", "http://evil.example")
            .expect(403);
        expect(server.database[video.id]).toBeDefined();
    });
});

// P5-03
describe("PASSWORD", () => {
    const basic = (credentials: string) =>
        "Basic " + Buffer.from(credentials).toString("base64");

    test("is required for the API, as JSON", async () => {
        const server = await loadServer({ password: "secret" });
        const res = await request(server.app).get("/api/videos").expect(401);
        expect(res.headers["www-authenticate"]).toMatch(/^Basic realm=/);
        expect(res.body).toEqual({ error: "password required" });
    });

    test("is required for pages", async () => {
        const server = await loadServer({ password: "secret" });
        const res = await request(server.app).get("/watch/x").expect(401);
        expect(res.headers["www-authenticate"]).toMatch(/^Basic realm=/);
        expect(res.text).toBe("Password required");
    });

    test.each([
        ["a wrong password", "user:wrong"],
        ["a longer password", "user:secret1"],
        ["no user name separator", "secret"],
    ])("refuses %s", async (_, credentials) => {
        const server = await loadServer({ password: "secret" });
        await request(server.app)
            .get("/api/videos")
            .set("Authorization", basic(credentials))
            .expect(401);
    });

    test.each(["user:secret", ":secret"])(
        "accepts %s (any user name)",
        async (credentials) => {
            const server = await loadServer({ password: "secret" });
            await request(server.app)
                .get("/api/videos")
                .set("Authorization", basic(credentials))
                .expect(200);
        }
    );

    test("may contain a colon", async () => {
        const server = await loadServer({ password: "a:b" });
        await request(server.app)
            .get("/api/videos")
            .set("Authorization", basic("user:a:b"))
            .expect(200);
    });

    test("is not needed when unset", async () => {
        const server = await loadServer();
        await request(server.app).get("/api/videos").expect(200);
    });
});
