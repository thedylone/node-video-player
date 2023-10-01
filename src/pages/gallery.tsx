import { Outlet, useLoaderData, Await } from "react-router-dom";
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
                {videos.map((video, index) => (
                    <VideoItem key={index} video={video} />
                ))}
            </div>
            <Outlet />
        </>
    );
};

const Gallery = () => {
    const data = useLoaderData() as { videos: Video[] };
    document.title = "Video Player";
    return (
        <Content>
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
