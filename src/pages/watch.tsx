import { Outlet, useLoaderData, Form, useSubmit } from "react-router-dom";
import { Video } from "../server/schema";

const Watch = () => {
    const video = useLoaderData() as Video;
    const submit = useSubmit();
    if (!video) {
        return (
            <div className="empty">
                <span>no video</span>
            </div>
        );
    }
    document.title = video.title;
    const index = new URLSearchParams(location.search).get("index") || 0;
    return (
        <Form onChange={(e) => submit(e.currentTarget)} className="content">
            <input type="hidden" name="id" value={video.id} />
            <video
                src={encodeURI("/api/stream/" + video.id + "?index=" + index)}
                controls
                preload="metadata"
            ></video>
            <Outlet />
        </Form>
    );
};

export default Watch;
