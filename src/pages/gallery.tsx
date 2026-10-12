import { FC, useEffect, useRef, useState } from "react";
import {
    Link,
    Outlet,
    useLoaderData,
    useSearchParams,
    Await,
} from "react-router";
import type { videosLoader } from "../api";
import { Video } from "../shared/schema";
import Content from "../components/content";
import VideoItem from "../components/video";

/** how many videos are added to the grid at a time. */
export const PAGE_SIZE = 24;

/**
 * the gallery grid. it starts with PAGE_SIZE videos and adds more as the
 * end of the grid scrolls near, so a large library doesn't render (and load
 * a thumbnail for) every title at once.
 */
const VideoGrid: FC<{ videos: Video[] }> = ({ videos }) => {
    // without IntersectionObserver (e.g. old browsers), show everything
    const [count, setCount] = useState(() =>
        typeof IntersectionObserver === "undefined" ? Infinity : PAGE_SIZE
    );
    const end = useRef<HTMLDivElement>(null);
    const shown = Math.min(count, videos.length);
    useEffect(() => {
        if (!end.current || shown >= videos.length) return;
        // a new observer reports at once whether the end is still in view,
        // so a tall screen keeps adding until it is full
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting))
                    setCount(shown + PAGE_SIZE);
            },
            // start before the end comes into view, so scrolling doesn't stop
            { rootMargin: "100% 0px" }
        );
        observer.observe(end.current);
        return () => observer.disconnect();
    }, [shown, videos.length]);
    return (
        <div className="grid">
            {videos.slice(0, shown).map((video) => (
                <VideoItem key={video.id} video={video} />
            ))}
            {shown < videos.length && <div ref={end} className="grid-end" />}
        </div>
    );
};

/** the gallery without the search, keeping the filters and sort. */
const withoutSearch = (params: URLSearchParams) => {
    const rest = new URLSearchParams(params);
    rest.delete("search");
    return rest.size ? "/?" + rest : "/";
};

/** what to show when no title is listed, and how to change that. */
const Empty: FC<{ params: URLSearchParams }> = ({ params }) => {
    const search = params.get("search");
    if (search) {
        return (
            <div className="notice">
                <h1>No titles match “{search}”</h1>
                <p>
                    The search looks at title names and tags. Try another word,
                    or <Link to={withoutSearch(params)}>clear the search</Link>.
                </p>
            </div>
        );
    }
    if (params.has("filter")) {
        return (
            <div className="notice">
                <h1>No titles in these sources</h1>
                <p>Pick other sources in Filters.</p>
            </div>
        );
    }
    return (
        <div className="notice">
            <h1>No videos yet</h1>
            <p>
                Put videos in the videos folder as{" "}
                <code>source/title/video.mp4</code>. They show up here a few
                seconds later.
            </p>
        </div>
    );
};

const Gallery = () => {
    const data = useLoaderData<typeof videosLoader>();
    const [params] = useSearchParams();
    const search = params.get("search");
    useEffect(() => {
        document.title = search ? `${search} - Video Player` : "Video Player";
    }, [search]);
    return (
        <Content>
            {/* the form replaces the query string, so keep the search in it */}
            {search && <input type="hidden" name="search" value={search} />}
            <Await
                resolve={data.videos}
                errorElement={
                    <div className="notice">
                        <h1>Couldn't load the library</h1>
                        <p>Check that the server is running, then reload.</p>
                    </div>
                }
            >
                {(videos: Video[]) => (
                    <>
                        {videos.length === 0 ? (
                            <Empty params={params} />
                        ) : (
                            <main className="main">
                                <p className="summary">
                                    {videos.length}{" "}
                                    {videos.length === 1 ? "title" : "titles"}
                                    {search && <> matching “{search}”</>}
                                    {search && (
                                        <Link to={withoutSearch(params)}>
                                            Clear search
                                        </Link>
                                    )}
                                </p>
                                {/* a new search, filter or sort starts at
                                    the top with one page again */}
                                <VideoGrid
                                    key={params.toString()}
                                    videos={videos}
                                />
                            </main>
                        )}
                        <Outlet />
                    </>
                )}
            </Await>
        </Content>
    );
};

export default Gallery;
