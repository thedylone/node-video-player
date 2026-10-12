import * as fs from "fs";
import * as path from "path";
import { afterEach, describe, expect, test, vi } from "vitest";
import { loadServer, TestServer } from "./test-server";

// P5-04. these wait for real file system events, so give them time
describe("watching DIRECTORY", { timeout: 15_000 }, () => {
    const stops: (() => void)[] = [];

    afterEach(() => {
        // close the watchers before the temporary folders are deleted
        stops.splice(0).forEach((stop) => stop());
        vi.useRealTimers();
    });

    /** starts the server and waits for its first scan. */
    const start = async (server: TestServer) => {
        stops.push(server.start());
        await vi.waitFor(() =>
            expect(server.log.info).toHaveBeenCalledWith("database updated")
        );
        server.log.info.mockClear();
    };

    const write = (server: TestServer, file: string) => {
        const filePath = path.join(server.directory, file);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, "");
    };

    const titles = (server: TestServer) =>
        Object.values(server.database).map((x) => x.title);

    /** waits long enough for a change to have started a scan. */
    const settle = () => new Promise((resolve) => setTimeout(resolve, 3000));

    test("a new title shows up without waiting for the next scan", async () => {
        const server = await loadServer({ files: { "s/a/1.mp4": "" } });
        await start(server);
        write(server, "s/b/1.webm");
        await vi.waitFor(() => expect(titles(server)).toContain("b"), {
            timeout: 5000,
        });
        expect(server.log.info).toHaveBeenCalledWith("database updated");
    });

    test("a removed title is pruned", async () => {
        const server = await loadServer({
            files: { "s/a/1.mp4": "", "s/b/1.mp4": "" },
        });
        await start(server);
        fs.rmSync(path.join(server.directory, "s/b"), { recursive: true });
        await vi.waitFor(() => expect(titles(server)).toEqual(["a"]), {
            timeout: 5000,
        });
    });

    test("many changes start one scan", async () => {
        const server = await loadServer();
        await start(server);
        for (let i = 0; i < 20; i++) write(server, `s/t${i}/1.mp4`);
        await vi.waitFor(() => expect(titles(server)).toHaveLength(20), {
            timeout: 5000,
        });
        await settle();
        const updates = server.log.info.mock.calls.filter(
            ([message]) => message === "database updated"
        );
        expect(updates).toHaveLength(1);
    });

    test("saving a thumbnail doesn't start a scan", async () => {
        const server = await loadServer({ files: { "s/a/1.mp4": "" } });
        await start(server);
        write(server, "s/a/tn.png");
        await settle();
        expect(server.log.info).not.toHaveBeenCalled();
    });

    test("a database kept in DIRECTORY doesn't rescan after every save", async () => {
        const server = await loadServer({
            files: { "s/a/1.mp4": "" },
            dbFile: "videos/db.json",
        });
        await start(server);
        await settle();
        expect(server.log.info).not.toHaveBeenCalled();
    });

    test("stop() stops watching", async () => {
        const server = await loadServer({ files: { "s/a/1.mp4": "" } });
        await start(server);
        stops.pop()!();
        write(server, "s/b/1.mp4");
        await settle();
        expect(titles(server)).toEqual(["a"]);
    });

    test("without DIRECTORY, scans every minute and watches once it exists", async () => {
        const server = await loadServer();
        fs.rmSync(server.directory, { recursive: true });
        vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
        stops.push(server.start());
        await vi.waitFor(() =>
            expect(server.log.error).toHaveBeenCalledWith(
                "updateDatabase",
                expect.anything()
            )
        );
        expect(server.log.error).toHaveBeenCalledWith(
            `can't watch ${server.directory}, scanning every minute`,
            expect.anything()
        );
        write(server, "s/a/1.mp4");
        vi.advanceTimersByTime(60_000);
        await vi.waitFor(() => expect(titles(server)).toEqual(["a"]));
        expect(server.log.info).toHaveBeenCalledWith(
            `watching ${server.directory} for changes`
        );
        // and it is watched now
        write(server, "s/b/1.mp4");
        await vi.waitFor(() => expect(titles(server)).toContain("b"), {
            timeout: 5000,
        });
    });

    test("while watching, scans every 10 minutes anyway", async () => {
        const server = await loadServer({ files: { "s/a/1.mp4": "" } });
        vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
        await start(server);
        vi.advanceTimersByTime(9 * 60_000);
        expect(server.log.info).not.toHaveBeenCalled();
        vi.advanceTimersByTime(60_000);
        await vi.waitFor(() =>
            expect(server.log.info).toHaveBeenCalledWith("database updated")
        );
    });
});

// P5-04
describe("updateDatabase", () => {
    test("combines scans requested while one runs into one more", async () => {
        const server = await loadServer({ files: { "s/a/1.mp4": "" } });
        await Promise.all([
            server.updateDatabase(),
            server.updateDatabase(),
            server.updateDatabase(),
        ]);
        const updates = server.log.info.mock.calls.filter(
            ([message]) => message === "database updated"
        );
        expect(updates).toHaveLength(2);
        expect(titles(server)).toEqual(["a"]);
    });
});

const titles = (server: TestServer) =>
    Object.values(server.database).map((x) => x.title);
