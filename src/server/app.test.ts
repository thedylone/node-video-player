import request from "supertest";
import { afterEach, describe, expect, test, vi } from "vitest";
import { loadServer } from "./test-server";

// P3-04
describe("errors", () => {
    test.each([
        ["get", "/api/nope"],
        ["post", "/api/nope"],
        ["get", "/api/videos/id"],
        ["get", "/api"],
    ] as const)("%s %s is a JSON 404", async (method, path) => {
        const server = await loadServer();
        const agent = request(server.app);
        const res = await agent[method](path).expect(404);
        expect(res.body).toEqual({ error: "Not Found" });
    });

    test("a malformed JSON body is a 400 and isn't logged", async () => {
        const server = await loadServer();
        const res = await request(server.app)
            .post("/api/count")
            .set("content-type", "application/json")
            .send("{ not json")
            .expect(400);
        expect(res.body.error).toEqual(expect.any(String));
        expect(server.log.error).not.toHaveBeenCalled();
    });
});

describe("start", () => {
    const stdout = process.stdout as unknown as Record<string, unknown>;
    const saved = {
        isTTY: stdout.isTTY,
        clearLine: stdout.clearLine,
        cursorTo: stdout.cursorTo,
    };

    afterEach(() => {
        Object.assign(stdout, saved);
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    /** starts the server, waits for the first scan, and returns stop(). */
    const startServer = async () => {
        const server = await loadServer({ files: { "s/t/1.mp4": "" } });
        vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
        const stop = server.start();
        await vi.waitFor(() =>
            expect(server.log.info).toHaveBeenCalledWith("database updated")
        );
        return { server, stop };
    };

    // P1-02: these functions don't exist when output is piped
    test("without a terminal, doesn't draw the uptime", async () => {
        Object.assign(stdout, {
            isTTY: undefined,
            clearLine: undefined,
            cursorTo: undefined,
        });
        const { stop } = await startServer();
        expect(() => vi.advanceTimersByTime(5000)).not.toThrow();
        stop();
    });

    test("on a terminal, draws the uptime every second", async () => {
        const write = vi.spyOn(process.stdout, "write");
        write.mockImplementation(() => true);
        Object.assign(stdout, {
            isTTY: true,
            clearLine: vi.fn(),
            cursorTo: vi.fn(),
        });
        const { stop } = await startServer();
        // move the clock without running an hour of scans, then tick once
        vi.setSystemTime(Date.now() + 3_660_000);
        vi.advanceTimersByTime(1000);
        expect(write).toHaveBeenLastCalledWith("uptime: 01:01:01\t");
        stop();
    });

    // P1-10: the dev plugin stops the old copy when it reloads the server
    test("stop() clears the timers", async () => {
        Object.assign(stdout, { isTTY: true, clearLine: vi.fn() });
        vi.spyOn(process.stdout, "write").mockImplementation(() => true);
        const { server, stop } = await startServer();
        expect(vi.getTimerCount()).toBe(2);
        stop();
        expect(vi.getTimerCount()).toBe(0);
        server.log.info.mockClear();
        vi.advanceTimersByTime(120_000);
        expect(server.log.info).not.toHaveBeenCalled();
    });
});
