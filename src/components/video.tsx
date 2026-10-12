import { FC, useEffect, useRef } from "react";
import { Link } from "react-router";
import { Video } from "../shared/schema";
import SourceLabel from "./source";
import { sourceStyle } from "./source-color";
import { TagLink } from "./tag";
import styles from "./video.module.css";
import { watchedText } from "./watched";

type Timers = {
    start?: ReturnType<typeof setTimeout>;
    stop?: ReturnType<typeof setTimeout>;
};

const VideoItem: FC<{ video: Video }> = ({ video }) => {
    // kept across renders, so a re-render can't lose a running timer
    const timers = useRef<Timers>({});
    useEffect(() => {
        const current = timers.current;
        // don't start or stop a preview after the item is gone
        return () => {
            clearTimeout(current.start);
            clearTimeout(current.stop);
        };
    }, []);
    const startPreview = (
        e: React.MouseEvent<HTMLVideoElement, MouseEvent>
    ) => {
        const vid = e.currentTarget;
        timers.current.start = setTimeout(() => {
            vid.controls = true;
            vid.play();
            timers.current.stop = setTimeout(() => {
                vid.controls = false;
                vid.load();
            }, 10000);
        }, 1000);
    };
    const stopPreview = (e: React.MouseEvent<HTMLVideoElement, MouseEvent>) => {
        clearTimeout(timers.current.start);
        clearTimeout(timers.current.stop);
        const vid = e.currentTarget;
        vid.controls = false;
        vid.load();
    };
    return (
        <article className={styles.card} style={sourceStyle(video.source)}>
            <Link className={styles.link} to={`/watch/${video.id}`}>
                <div className={styles.thumb}>
                    {/* shown until the thumbnail loads, or if it has none */}
                    <span className={styles.initial} aria-hidden="true">
                        {Array.from(video.title)[0]?.toUpperCase()}
                    </span>
                    <video
                        className={styles.preview}
                        src={encodeURI("/api/stream/" + video.id)}
                        poster={encodeURI("/api/thumbnail/" + video.id)}
                        muted
                        preload="none"
                        onMouseEnter={startPreview}
                        onMouseLeave={stopPreview}
                    ></video>
                </div>
                <h2 className={styles.title}>{video.title}</h2>
            </Link>
            <div className={styles.meta}>
                <SourceLabel source={video.source} />
                <span className="tabular">{watchedText(video.counter)}</span>
            </div>
            {video.tags.length > 0 && (
                <div className={styles.tags}>
                    {video.tags.map((tag) => (
                        <TagLink key={tag} tag={tag} />
                    ))}
                </div>
            )}
        </article>
    );
};

export default VideoItem;
