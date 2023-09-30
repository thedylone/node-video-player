import { Outlet, useLoaderData } from "react-router-dom";
import { Video } from "../server/schema";
import styles from "./watch.module.css";

const Watch = () => {
    const video = useLoaderData() as Video;
    if (!video) {
        return (
            <div className="empty">
                <span>no video</span>
            </div>
        );
    }
    document.title = video.title;
    return (
        <>
        <video
            className={styles.video}
            src={encodeURI("/api/stream/" + video.id)}
            poster={encodeURI("/api/thumbnail/" + video.id)}
            controls
            preload="metadata"
        ></video>
        <Outlet />
        </>
    );
};

export default Watch;
