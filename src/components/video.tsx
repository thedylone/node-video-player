import { FC, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Video } from "../shared/schema";
import Tag from "./tag";

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
        <div className="flex-col pad-1em">
            <Link className="flex-col" to={`/watch/${video.id}`}>
                <video
                    className="preview"
                    src={encodeURI("/api/stream/" + video.id)}
                    poster={encodeURI("/api/thumbnail/" + video.id)}
                    muted
                    preload="none"
                    onMouseEnter={startPreview}
                    onMouseLeave={stopPreview}
                ></video>
                <div className="title">{video.title}</div>
            </Link>
            <div
                className="flex-row"
                style={{ justifyContent: "space-between" }}
            >
                <span className="subtitle">{video.source}</span>
                <span className="subtitle">{video.counter}</span>
            </div>
            <div className="flex-row">
                <span>tags:</span>
                {video.tags.map((tag) => (
                    <Tag key={tag} id={video.id} tag={tag} />
                ))}
            </div>
        </div>
    );
};

export default VideoItem;
