import { FC, useEffect } from "react";
import {
    Outlet,
    useLoaderData,
    useSearchParams,
    Await,
} from "react-router-dom";
import { Video } from "../shared/schema";
import Content from "../components/content";

const VideoContent: FC<{ video: Video; index: string }> = ({
    video,
    index,
}) => {
    useEffect(() => {
        document.title = video.title;
    }, [video.title]);
    return (
        <>
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
    const index = useSearchParams()[0].get("index") || "0";
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
                    return <VideoContent video={video} index={index} />;
                }}
            </Await>
        </Content>
    );
};

export default Watch;
