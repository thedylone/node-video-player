import * as fs from "fs";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { loadServer, TestServer } from "./test-server";

/**
 * a fake fluent-ffmpeg. each screenshot becomes a job that stays running
 * until the test finishes it with succeed() or fail().
 */
const ffmpeg = vi.hoisted(() => {
    type Handler = (...args: unknown[]) => void;
    type Job = {
        video: string;
        output: string;
        handlers: { [event: string]: Handler };
    };
    const state = { jobs: [] as Job[], running: 0, mostRunning: 0 };
    const FFmpeg = (video: string) => {
        const job: Job = { video, output: "", handlers: {} };
        const command = {
            screenshot: (options: { filename: string }, folder: string) => {
                job.output = folder + "/" + options.filename;
                state.jobs.push(job);
                state.running++;
                state.mostRunning = Math.max(state.mostRunning, state.running);
                return command;
            },
            on: (event: string, handler: Handler) => {
                job.handlers[event] = handler;
                return command;
            },
        };
        return command;
    };
    FFmpeg.setFfmpegPath = () => {};
    FFmpeg.setFfprobePath = () => {};
    return { FFmpeg, state };
});

vi.mock("fluent-ffmpeg", () => ({ default: ffmpeg.FFmpeg }));

type Job = (typeof ffmpeg.state.jobs)[number];

/** finishes the job, saving its thumbnail. */
const succeed = (job: Job) => {
    ffmpeg.state.running--;
    fs.writeFileSync(job.output, "");
    job.handlers.end();
};

/** fails the job with this message. */
const fail = (job: Job, message: string) => {
    ffmpeg.state.running--;
    job.handlers.error(new Error(message), "", "");
};

/** lets the queue move on after a job finishes. */
const settle = () => new Promise((resolve) => setImmediate(resolve));

const lastJob = () => ffmpeg.state.jobs[ffmpeg.state.jobs.length - 1];

const jobVideos = () =>
    ffmpeg.state.jobs.map((job) => path.relative(server.directory, job.video));

let server: TestServer;

beforeEach(async () => {
    Object.assign(ffmpeg.state, { jobs: [], running: 0, mostRunning: 0 });
    vi.useFakeTimers({ toFake: ["Date"] });
    server = await loadServer({
        ffmpeg: true,
        files: {
            "s/a/2.mp4": "",
            "s/a/10.mp4": "",
            "s/b/1.mp4": "",
            "s/c/1.mp4": "",
            "s/done/1.mp4": "",
            "s/done/tn.png": "",
            "s/empty/notes.txt": "",
        },
    });
});

afterEach(() => {
    server.clearThumbnailQueue();
    vi.useRealTimers();
});

// P3-05
describe("thumbnails", () => {
    test("are made one at a time, from each title's first video", async () => {
        await server.updateDatabase();
        expect(jobVideos()).toEqual([path.join("s", "a", "2.mp4")]);
        while (ffmpeg.state.running) {
            succeed(lastJob());
            await settle();
        }
        expect(jobVideos()).toEqual([
            path.join("s", "a", "2.mp4"),
            path.join("s", "b", "1.mp4"),
            path.join("s", "c", "1.mp4"),
        ]);
        expect(ffmpeg.state.mostRunning).toBe(1);
        expect(fs.existsSync(path.join(server.directory, "s/c/tn.png"))).toBe(
            true
        );
        expect(server.log.info).toHaveBeenCalledWith("thumbnail saved for s/c");
    });

    test("a title isn't queued twice", async () => {
        await server.updateDatabase();
        await server.updateDatabase();
        while (ffmpeg.state.running) {
            succeed(lastJob());
            await settle();
        }
        expect(ffmpeg.state.jobs).toHaveLength(3);
        // every title has tn.png now
        await server.updateDatabase();
        expect(ffmpeg.state.jobs).toHaveLength(3);
    });

    test("a failed video waits 5 minutes, then twice as long each time", async () => {
        fs.rmSync(path.join(server.directory, "s/b"), { recursive: true });
        fs.rmSync(path.join(server.directory, "s/c"), { recursive: true });
        const attempt = async (minutes: number) => {
            vi.setSystemTime(start + minutes * 60 * 1000);
            const before = ffmpeg.state.jobs.length;
            await server.updateDatabase();
            const started = ffmpeg.state.jobs.length > before;
            if (started) {
                fail(lastJob(), "broken video");
                await settle();
            }
            return started;
        };
        const start = Date.now();
        expect(await attempt(0)).toBe(true);
        expect(server.log.error).toHaveBeenCalledWith(
            "thumbnail for s/a/2.mp4 failed, retrying in 5 min",
            expect.stringContaining("broken video")
        );
        expect(await attempt(4)).toBe(false);
        expect(await attempt(5)).toBe(true);
        // 10 minutes after the second failure
        expect(await attempt(14)).toBe(false);
        expect(await attempt(15)).toBe(true);
    });

    test("a new first video is tried at once", async () => {
        fs.rmSync(path.join(server.directory, "s/b"), { recursive: true });
        fs.rmSync(path.join(server.directory, "s/c"), { recursive: true });
        await server.updateDatabase();
        fail(ffmpeg.state.jobs[0], "broken video");
        await settle();
        fs.writeFileSync(path.join(server.directory, "s/a/1.mp4"), "");
        await server.updateDatabase();
        expect(jobVideos()).toEqual([
            path.join("s", "a", "2.mp4"),
            path.join("s", "a", "1.mp4"),
        ]);
    });

    test("clearThumbnailQueue drops jobs that haven't started", async () => {
        await server.updateDatabase();
        server.clearThumbnailQueue();
        succeed(ffmpeg.state.jobs[0]);
        await settle();
        expect(ffmpeg.state.jobs).toHaveLength(1);
        // and they can be queued again
        await server.updateDatabase();
        expect(ffmpeg.state.jobs).toHaveLength(2);
    });
});
