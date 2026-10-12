// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { addCount, deleteVideo } from "../api";
import { Video } from "../shared/schema";
import Watch from "./watch";
import WatchSidebar from "./watch-sidebar";

vi.mock("../api");

/** a promise the test resolves, standing in for a slow request. */
const deferred = <T,>() => {
    let resolve!: (value: T) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
};

let video: Video;

beforeEach(() => {
    vi.resetAllMocks();
    video = {
        id: "v1",
        title: "Heat",
        source: "films",
        counter: 0,
        tags: [],
        vids: ["a.mp4", "b.mp4"],
    };
});

/** renders the watch page as App.tsx does, with the loader reading video. */
const renderWatch = (url = "/watch/v1") => {
    const loader = vi.fn(() => ({ video: { ...video } }));
    const router = createMemoryRouter(
        [
            { path: "/", element: <p>gallery</p> },
            {
                path: "/watch/:id",
                id: "watch",
                loader,
                element: <Watch />,
                children: [{ index: true, element: <WatchSidebar /> }],
            },
        ],
        { initialEntries: [url] }
    );
    render(<RouterProvider router={router} />);
    return { router, loader };
};

const radio = (name: string) => screen.getByLabelText(name) as HTMLInputElement;

// P2-05
describe("videos", () => {
    test("plays and checks the video picked by ?index", async () => {
        renderWatch("/watch/v1?index=1");
        await screen.findByText("Count: 0");
        expect(radio("b.mp4").checked).toBe(true);
        expect(radio("a.mp4").checked).toBe(false);
        expect(document.querySelector("video")!.getAttribute("src")).toBe(
            "/api/stream/v1?index=1"
        );
    });

    test("picking a video changes the URL, and the URL the radio", async () => {
        const { router } = renderWatch();
        await screen.findByText("Count: 0");
        expect(radio("a.mp4").checked).toBe(true);
        fireEvent.click(radio("b.mp4"));
        await waitFor(() =>
            expect(router.state.location.search).toBe("?index=1")
        );
        expect(document.querySelector("video")!.getAttribute("src")).toBe(
            "/api/stream/v1?index=1"
        );
        // e.g. the back button
        router.navigate(-1);
        await waitFor(() => expect(radio("a.mp4").checked).toBe(true));
    });
});

// P1-12
describe("count", () => {
    test("reloads only after the change is saved", async () => {
        const saved = deferred<number>();
        vi.mocked(addCount).mockReturnValue(saved.promise);
        const { loader } = renderWatch();
        fireEvent.click(await screen.findByText("+1"));
        expect(addCount).toHaveBeenCalledWith({ id: "v1", num: 1 });
        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(loader).toHaveBeenCalledTimes(1);
        video.counter = 1;
        saved.resolve(1);
        await screen.findByText("Count: 1");
    });

    test("shows the right count after quick clicks saved out of order", async () => {
        const saves = [deferred<number>(), deferred<number>()];
        vi.mocked(addCount)
            .mockReturnValueOnce(saves[0].promise)
            .mockReturnValueOnce(saves[1].promise);
        renderWatch();
        fireEvent.click(await screen.findByText("+1"));
        fireEvent.click(screen.getByText("+1"));
        // the second save finishes first: its reload sees only one +1
        video.counter = 1;
        saves[1].resolve(1);
        await screen.findByText("Count: 1");
        video.counter = 2;
        saves[0].resolve(2);
        await screen.findByText("Count: 2");
    });

    test("-1 subtracts", async () => {
        vi.mocked(addCount).mockResolvedValue(-1);
        renderWatch();
        fireEvent.click(await screen.findByText("-1"));
        expect(addCount).toHaveBeenCalledWith({ id: "v1", num: -1 });
    });
});

// P1-11
describe("delete", () => {
    test("does nothing if not confirmed", async () => {
        const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
        renderWatch();
        fireEvent.click(await screen.findByText("delete video"));
        expect(confirm).toHaveBeenCalledWith(expect.stringContaining("Heat"));
        expect(deleteVideo).not.toHaveBeenCalled();
    });

    test("leaves the page only after the delete is done", async () => {
        vi.spyOn(window, "confirm").mockReturnValue(true);
        const deleted = deferred<void>();
        vi.mocked(deleteVideo).mockReturnValue(deleted.promise);
        const { router } = renderWatch();
        fireEvent.click(await screen.findByText("delete video"));
        expect(deleteVideo).toHaveBeenCalledWith({ id: "v1" });
        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(router.state.location.pathname).toBe("/watch/v1");
        deleted.resolve();
        await screen.findByText("gallery");
    });

    test("stays on the page and says so if the delete fails", async () => {
        vi.spyOn(window, "confirm").mockReturnValue(true);
        const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
        vi.mocked(deleteVideo).mockRejectedValue(new Error("Not Found"));
        const { router } = renderWatch();
        fireEvent.click(await screen.findByText("delete video"));
        await waitFor(() =>
            expect(alert).toHaveBeenCalledWith(
                expect.stringContaining("Not Found")
            )
        );
        expect(router.state.location.pathname).toBe("/watch/v1");
    });
});

test("a video that fails to load says so", async () => {
    const router = createMemoryRouter(
        [
            {
                path: "/watch/:id",
                id: "watch",
                // as videoLoader returns when the request fails
                loader: () => {
                    const video = Promise.reject(new Error("Not Found"));
                    video.catch(() => {});
                    return { video };
                },
                element: <Watch />,
                children: [{ index: true, element: <WatchSidebar /> }],
            },
        ],
        { initialEntries: ["/watch/nope"] }
    );
    render(<RouterProvider router={router} />);
    // in place of the video and its sidebar, which renders inside it
    await screen.findByText("error loading video!");
});

test("a title without videos says so", async () => {
    video.vids = [];
    renderWatch();
    await screen.findByText("no videos found!");
});
