import { FC } from "react";
import { Link } from "react-router-dom";
import { Video } from "../server/schema";
import styles from "./video.module.css";

const Tag: FC<{ tag: string }> = ({ tag }) => {
    return <div className={styles.tag}>{tag}</div>;
};

const VideoItem: FC<{ video: Video }> = ({ video }) => {
    let startPreviewTimeout: NodeJS.Timeout;
    let stopPreviewTimeout: NodeJS.Timeout;
    const startPreview = (
        e: React.MouseEvent<HTMLVideoElement, MouseEvent>
    ) => {
        const vid = e.target as HTMLVideoElement;
        startPreviewTimeout = setTimeout(() => {
            vid.controls = true;
            vid.play();
            stopPreviewTimeout = setTimeout(() => {
                vid.controls = false;
                vid.load();
            }, 10000);
        }, 1000);
    };
    const stopPreview = (e: React.MouseEvent<HTMLVideoElement, MouseEvent>) => {
        clearTimeout(startPreviewTimeout);
        clearTimeout(stopPreviewTimeout);
        const vid = e.target as HTMLVideoElement;
        vid.controls = false;
        vid.load();
    };
    return (
        <div className={styles.container}>
            <Link className={styles.container_top} to={`/watch?id=${video.id}`}>
                <video
                    src={encodeURI("/api/video/" + video.id)}
                    poster={encodeURI("/api/thumbnail/" + video.id)}
                    muted
                    preload="none"
                    onMouseEnter={startPreview}
                    onMouseLeave={stopPreview}
                ></video>
                <div className={styles.title}>{video.title}</div>
            </Link>
            <div className={styles.subtitle}>
                <span className={styles.source}>{video.source}</span>
                <span className={styles.counter}>{video.counter}</span>
            </div>
            <div className={styles.container_bottom}>
                <span>tags:</span>
                {video.tags.map((tag, index) => (
                    <Tag key={index} tag={tag} />
                ))}
            </div>
        </div>
    );
};

export default VideoItem;
