import { Outlet, useLoaderData } from "react-router-dom";
import { Video } from "../server/schema";
import VideoItem from "../components/video";
import styles from "./gallery.module.css";
// import Sidebar from "../components/sidebar";

const Gallery = () => {
    const videos = useLoaderData() as Video[];
    document.title = "Video Player";
    if (videos.length === 0) {
        return (
            <div className="empty">
                <span>no videos</span>
            </div>
        );
    }

    return (
        <>
            <div className={styles.grid}>
                {videos.map((video, index) => (
                    <VideoItem key={index} video={video} />
                ))}
            </div>
            <Outlet />
        </>
    );
};

export default Gallery;
