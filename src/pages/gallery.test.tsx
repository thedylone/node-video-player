// @vitest-environment jsdom
import {
    act,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, test, vi } from "vitest";
import { Video } from "../shared/schema";
import Gallery from "./gallery";
import GallerySidebar from "./gallery-sidebar";

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

const video = (id: string, title: string, source: string): Video => ({
    id,
    title,
    source,
    counter: 0,
    tags: [],
    vids: ["1.mp4"],
});

const videos = [video("v1", "Heat", "films"), video("v2", "Bluey", "shows")];

/** renders the gallery as App.tsx does, with loaders that filter videos. */
const renderGallery = (url = "/") => {
    const router = createMemoryRouter(
        [
            {
                path: "/",
                element: <Gallery />,
                loader: ({ request }) => {
                    const params = new URL(request.url).searchParams;
                    const filter = params.getAll("filter");
                    return {
                        videos: videos.filter(
                            (x) => !filter.length || filter.includes(x.source)
                        ),
                    };
                },
                children: [
                    {
                        index: true,
                        element: <GallerySidebar />,
                        loader: () => ({ sources: ["films", "shows"] }),
                    },
                ],
            },
            { path: "/watch/:id", element: <p>watch page</p> },
        ],
        { initialEntries: [url] }
    );
    render(<RouterProvider router={router} />);
    return router;
};

describe("gallery", () => {
    test("lists the videos", async () => {
        renderGallery();
        await screen.findByText("Heat");
        expect(screen.getByText("Bluey")).toBeTruthy();
    });

    // P2-04
    test("filtering by source keeps the search", async () => {
        const router = renderGallery("/?search=e");
        fireEvent.click(await screen.findByLabelText("films"));
        await waitFor(() =>
            expect(router.state.location.search).toBe("?search=e&filter=films")
        );
        await waitFor(() => expect(screen.queryByText("Bluey")).toBeNull());
    });

    test("says so when nothing matches", async () => {
        renderGallery("/?filter=none");
        await screen.findByText("no videos found!");
    });
});

// P2-07
describe("preview", () => {
    const setup = async () => {
        const play = vi
            .spyOn(HTMLMediaElement.prototype, "play")
            .mockResolvedValue();
        vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(
            () => {}
        );
        const router = renderGallery();
        const preview = (await screen.findByText("Heat"))
            .closest("a")!
            .querySelector("video")!;
        vi.useFakeTimers();
        return { router, play, preview };
    };

    test("starts a second after the mouse enters", async () => {
        const { play, preview } = await setup();
        fireEvent.mouseEnter(preview);
        act(() => vi.advanceTimersByTime(999));
        expect(play).not.toHaveBeenCalled();
        act(() => vi.advanceTimersByTime(1));
        expect(play).toHaveBeenCalledTimes(1);
    });

    test("doesn't start if the mouse leaves first", async () => {
        const { play, preview } = await setup();
        fireEvent.mouseEnter(preview);
        fireEvent.mouseLeave(preview);
        act(() => vi.advanceTimersByTime(5000));
        expect(play).not.toHaveBeenCalled();
    });

    test("doesn't start after leaving the page", async () => {
        const { router, play, preview } = await setup();
        fireEvent.mouseEnter(preview);
        await act(() => router.navigate("/watch/v1"));
        expect(screen.getByText("watch page")).toBeTruthy();
        act(() => vi.advanceTimersByTime(5000));
        expect(play).not.toHaveBeenCalled();
    });
});
