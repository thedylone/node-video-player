import { FC } from "react";
import { Link } from "react-router-dom";
import { Video } from "../server/schema";
import Tag from "./tag";

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
        <div className="flex-col pad-1em">
            <Link className="flex-col" to={`/watch?id=${video.id}`}>
                <video
                    src={encodeURI("/api/stream/" + video.id)}
                    poster={encodeURI("/api/thumbnail/" + video.id)}
                    muted
                    preload="none"
                    onMouseEnter={startPreview}
                    onMouseLeave={stopPreview}
                    style={{ borderRadius: "8px" }}
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
                {video.tags.map((tag, index) => (
                    <Tag key={index} id={video.id} tag={tag} />
                ))}
            </div>
        </div>
    );
};

export default VideoItem;
