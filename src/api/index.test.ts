import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
    addCount,
    fetchSources,
    fetchVideo,
    fetchVideos,
    videoLoader,
    videosLoader,
} from ".";

const fetch = vi.fn<typeof globalThis.fetch>();

beforeEach(() => {
    vi.stubGlobal("fetch", fetch);
    fetch.mockReset();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

const reply = (body: unknown, status = 200) =>
    fetch.mockResolvedValue(
        new Response(JSON.stringify(body), {
            status,
            statusText: status === 200 ? "OK" : "Not Found",
        })
    );

const request = (url: string) => new Request("http://localhost" + url);

describe("fetch functions", () => {
    test("fetchVideos passes the page's query string on", async () => {
        reply([]);
        await fetchVideos({ request: request("/?search=a%20b&filter=x") });
        expect(fetch).toHaveBeenCalledWith("/api/videos?search=a%20b&filter=x");
    });

    test("fetchVideos returns [] when the request fails", async () => {
        reply({ error: "oops" }, 500);
        expect(await fetchVideos({ request: request("/") })).toEqual([]);
    });

    // P2-05: a failed request shows the error element instead of crashing
    test("fetchVideo encodes the id and rejects when not found", async () => {
        reply({ error: "Not Found" }, 404);
        await expect(fetchVideo("a/b?c")).rejects.toThrow("Not Found");
        expect(fetch).toHaveBeenCalledWith("/api/videos/id/a%2Fb%3Fc");
    });

    test("fetchSources passes only the search on", async () => {
        reply(["s"]);
        expect(
            await fetchSources({
                request: request("/?search=a%26b&filter=x"),
            })
        ).toEqual(["s"]);
        expect(fetch).toHaveBeenCalledWith("/api/sources?search=a%26b");
    });

    // P2-04: the server sends the counter as JSON
    test("addCount posts JSON and returns the new counter", async () => {
        reply(5);
        expect(await addCount({ id: "v1", num: 1 })).toBe(5);
        const [url, init] = fetch.mock.calls[0];
        expect(url).toBe("/api/count");
        expect(JSON.parse(init!.body as string)).toEqual({ id: "v1", num: 1 });
    });
});

describe("loaders", () => {
    test("return their requests unawaited", () => {
        fetch.mockReturnValue(new Promise(() => {}));
        const args = { request: request("/"), params: { id: "v1" } };
        const videos = videosLoader(args as never);
        const video = videoLoader(args as never);
        expect(videos.videos).toBeInstanceOf(Promise);
        expect(video.video).toBeInstanceOf(Promise);
        expect(fetch).toHaveBeenCalledWith("/api/videos/id/v1");
    });

    test("a request that fails before anything awaits it isn't unhandled", async () => {
        fetch.mockRejectedValue(new TypeError("Failed to fetch"));
        const { video } = videoLoader({
            request: request("/watch/v1"),
            params: { id: "v1" },
        } as never);
        // vitest fails the run on an unhandled rejection
        await new Promise((resolve) => setTimeout(resolve, 20));
        await expect(video).rejects.toThrow("Failed to fetch");
    });
});
