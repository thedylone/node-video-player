import { Outlet, useLoaderData, Await } from "react-router-dom";
import { Video } from "../server/schema";
import Content from "../components/content";

const videoToContent = (video: Video, index: number | string) => {
    document.title = video.title;
    return (
        <>
            <input type="hidden" name="id" value={video.id} />
            <video
                src={encodeURI("/api/stream/" + video.id + "?index=" + index)}
                controls
                preload="metadata"
            ></video>
            <Outlet />
        </>
    );
};

const Watch = () => {
    const data = useLoaderData() as { video: Video };
    const index = new URLSearchParams(location.search).get("index") || 0;
    return (
        <Content>
            <Await
                resolve={data.video}
                errorElement={<div className="empty">error loading video!</div>}
            >
                {(video: Video) => {
                    if (video.vids.length === 0) {
                        return <div className="empty">no videos found!</div>;
                    }
                    return videoToContent(video, index);
                }}
            </Await>
        </Content>
    );
};

export default Watch;
