import { FC, useEffect, useRef, useState } from "react";
import { Outlet, useLoaderData, useSearchParams, Await } from "react-router";
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

const Gallery = () => {
    const data = useLoaderData<typeof videosLoader>();
    const [params] = useSearchParams();
    const search = params.get("search");
    useEffect(() => {
        document.title = "Video Player";
    }, []);
    return (
        <Content>
            {/* the form replaces the query string, so keep the search in it */}
            {search && <input type="hidden" name="search" value={search} />}
            <Await
                resolve={data.videos}
                errorElement={
                    <div className="empty">error loading videos!</div>
                }
            >
                {(videos: Video[]) => (
                    <>
                        {videos.length === 0 ? (
                            <div className="empty">no videos found!</div>
                        ) : (
                            // a new search, filter or sort starts at the top
                            // with one page again
                            <VideoGrid
                                key={params.toString()}
                                videos={videos}
                            />
                        )}
                        <Outlet />
                    </>
                )}
            </Await>
        </Content>
    );
};

export default Gallery;
