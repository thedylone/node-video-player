import React, { FC } from "react";
import { Video } from "../../../api/schema/video";

const Tag: FC<{ tag: string }> = ({ tag }) => {
    return (
        <div className="tag">
            {tag}
        </div>
    );
}

const VideoItem: FC<{ video: Video }> = ({ video }) => {
    return (
        <div className="container">
            <a className="container-top" href={`/watch?id=${video.id}`}>
                <video poster={encodeURI('/thumbnail?id=' + video.id)} muted preload="none"></video>
                <div className="title">{video.title}</div>
            </a>
            <div className="container-subtitle">
                <span>{video.source}</span>
                <span>{video.counter}</span>
            </div>
            <div className="container-bottom">
                <span>tags:</span>
                {video.tags.map((tag, index) => <Tag key={index} tag={tag} />)}
            </div>
        </div>
    );
};

export default VideoItem;