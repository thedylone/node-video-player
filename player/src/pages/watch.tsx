import React, { FC } from "react";
import { Video } from "../../../api/schema/video";

const Watch: FC<{ video?: Video }> = ({ video }) => {
    if (!video) {
        return (
            <div className="empty">
                <span>no video</span>
            </div>
        )
    }
    return (
        <video
            src={encodeURI("/video?id=" + video.id) + "index=0"}
            controls
            preload="metadata"
        ></video>
    );
};

export default Watch;
