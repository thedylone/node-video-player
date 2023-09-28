import React, { FC } from "react";
import { Video } from "../../../api/schema/video";
import VideoItem from "../components/video";

const Gallery: FC<{ videos: Video[] }> = ({ videos }) => {
    if (videos.length === 0) {
        return (
            <div className="empty">
                <span>no videos</span>
            </div>
        );
    }

    return (
        <div className="gallery">
            {videos.map((video, index) => (
                <VideoItem key={index} video={video} />
            ))}
        </div>
    );
};

export default Gallery;
