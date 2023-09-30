import { Outlet, useLoaderData, Form, useSubmit } from "react-router-dom";
import { Video } from "../server/schema";
import VideoItem from "../components/video";

const Gallery = () => {
    const videos = useLoaderData() as Video[];
    const submit = useSubmit();
    document.title = "Video Player";
    if (videos.length === 0) {
        return (
            <div className="empty">
                <span>no videos</span>
            </div>
        );
    }

    return (
        <Form onChange={(e) => submit(e.currentTarget)} className="content">
            <div className="grid">
                {videos.map((video, index) => (
                    <VideoItem key={index} video={video} />
                ))}
            </div>
            <Outlet />
        </Form>
    );
};

export default Gallery;
