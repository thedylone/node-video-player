// @vitest-environment jsdom
import {
    act,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
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
    added: 0,
});

const initial = [video("v1", "Heat", "films"), video("v2", "Bluey", "shows")];
const videos = [...initial];

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
            expect(router.state.location.search).toBe(
                "?search=e&sort=newest&filter=films"
            )
        );
        await waitFor(() => expect(screen.queryByText("Bluey")).toBeNull());
    });

    test("says so when nothing matches", async () => {
        renderGallery("/?filter=none");
        await screen.findByText("no videos found!");
    });

    // P5-02: the filters used to be hidden, so they couldn't be undone
    test("shows the filters when nothing matches", async () => {
        renderGallery("/?filter=none");
        await screen.findByText("no videos found!");
        expect(await screen.findByLabelText("films")).toBeTruthy();
    });

    // P5-02
    test("checks the filters in the URL", async () => {
        renderGallery("/?filter=films");
        const films = (await screen.findByLabelText(
            "films"
        )) as HTMLInputElement;
        const shows = screen.getByLabelText("shows") as HTMLInputElement;
        expect(films.checked).toBe(true);
        expect(shows.checked).toBe(false);
    });

    // P5-02
    test("sorting keeps the search and filters", async () => {
        const router = renderGallery("/?search=e&filter=films");
        const sort = (await screen.findByLabelText(
            "Sort by"
        )) as HTMLSelectElement;
        expect(sort.value).toBe("newest");
        fireEvent.change(sort, { target: { value: "name" } });
        await waitFor(() =>
            expect(router.state.location.search).toBe(
                "?search=e&sort=name&filter=films"
            )
        );
    });

    // P5-02
    test("shows the sort in the URL", async () => {
        renderGallery("/?sort=least");
        const sort = (await screen.findByLabelText(
            "Sort by"
        )) as HTMLSelectElement;
        expect(sort.value).toBe("least");
    });
});

// P5-02
describe("lazy loading", () => {
    /** a stand-in IntersectionObserver whose callbacks the test calls. */
    const observers: {
        callback: IntersectionObserverCallback;
        target?: Element;
    }[] = [];
    class FakeObserver {
        entry: (typeof observers)[number];
        constructor(callback: IntersectionObserverCallback) {
            this.entry = { callback };
            observers.push(this.entry);
        }
        observe(target: Element) {
            this.entry.target = target;
        }
        disconnect() {
            observers.splice(observers.indexOf(this.entry), 1);
        }
    }

    /** reports the end of the grid as in view to the current observer. */
    const scrollToEnd = () =>
        act(() => {
            for (const { callback, target } of [...observers]) {
                callback(
                    [
                        {
                            isIntersecting: true,
                            target,
                        } as IntersectionObserverEntry,
                    ],
                    {} as IntersectionObserver
                );
            }
        });

    const many = Array.from({ length: 60 }, (_, i) =>
        video("m" + i, "Title " + i, "films")
    );

    const shown = () => document.querySelectorAll("a[href^='/watch/']").length;

    test("shows one page, then another each time the end is near", async () => {
        vi.stubGlobal("IntersectionObserver", FakeObserver);
        videos.splice(0, videos.length, ...many);
        try {
            renderGallery();
            await screen.findByText("Title 0");
            expect(shown()).toBe(24);
            scrollToEnd();
            expect(shown()).toBe(48);
            scrollToEnd();
            expect(shown()).toBe(60);
            // nothing left to watch for
            expect(observers).toHaveLength(0);
        } finally {
            vi.unstubAllGlobals();
            videos.splice(0, videos.length, ...initial);
        }
    });

    test("a new search starts with one page again", async () => {
        vi.stubGlobal("IntersectionObserver", FakeObserver);
        videos.splice(0, videos.length, ...many);
        try {
            const router = renderGallery();
            await screen.findByText("Title 0");
            scrollToEnd();
            expect(shown()).toBe(48);
            await act(() => router.navigate("/?search=title"));
            await waitFor(() => expect(shown()).toBe(24));
        } finally {
            vi.unstubAllGlobals();
            videos.splice(0, videos.length, ...initial);
        }
    });

    test("shows everything without IntersectionObserver", async () => {
        videos.splice(0, videos.length, ...many);
        try {
            renderGallery();
            await screen.findByText("Title 0");
            expect(shown()).toBe(60);
        } finally {
            videos.splice(0, videos.length, ...initial);
        }
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
