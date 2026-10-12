import {
    Outlet,
    useLoaderData,
    useSearchParams,
    Await,
} from "react-router-dom";
import { Video } from "../server/schema";
import Content from "../components/content";
import VideoItem from "../components/video";

const videosToContent = (videos: Video[]) => {
    if (videos.length === 0) {
        return <div className="empty">no videos found!</div>;
    }
    return (
        <>
            <div className="grid">
                {videos.map((video) => (
                    <VideoItem key={video.id} video={video} />
                ))}
            </div>
            <Outlet />
        </>
    );
};

const Gallery = () => {
    const data = useLoaderData() as { videos: Video[] };
    const search = useSearchParams()[0].get("search");
    document.title = "Video Player";
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
                {videosToContent}
            </Await>
        </Content>
    );
};

export default Gallery;
