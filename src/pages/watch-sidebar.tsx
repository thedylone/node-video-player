import { Await, useLoaderData } from "react-router-dom";
import { Video } from "../server/schema";
import { addCount, deleteVideo } from "../server/api";
import Sidebar from "../components/sidebar";
import Tag, { TagAdder } from "../components/tag";

const videoToContent = (video: Video) => (
    <>
        <div>
            <h2>{video.title}</h2>
            <h3 className="subtitle">{video.source}</h3>
        </div>
        <div>
            <h2>Videos</h2>
            <div className="flex-col">
                {video.vids.map((vid, index) => (
                    <label key={index}>
                        <input
                            type="radio"
                            name="index"
                            value={index}
                            defaultChecked={index === 0}
                        />
                        {vid}
                    </label>
                ))}
            </div>
        </div>
        <div>
            <h2>Count: {video.counter}</h2>
            <button
                type="submit"
                name="num"
                value="-1"
                onClick={async () => {
                    await addCount({ id: video.id, num: -1 });
                }}
            >
                -1
            </button>
            <button
                type="submit"
                name="num"
                value="1"
                onClick={async () => {
                    await addCount({ id: video.id, num: 1 });
                }}
            >
                +1
            </button>
            <button
                type="submit"
                name="delete"
                onClick={async () => {
                    location.href = "/";
                    await deleteVideo({ id: video.id });
                }}
            >
                delete video
            </button>
        </div>
        <div>
            <h2>Tags</h2>
            <div className="flex-row">
                {video.tags.map((tag, index) => (
                    <Tag key={index} id={video.id} tag={tag} />
                ))}
                <TagAdder id={video.id} />
            </div>
        </div>
    </>
);

const WatchSidebar = () => {
    const data = useLoaderData() as { video: Video };
    return (
        <Sidebar>
            <Await
                resolve={data.video}
                errorElement={<div className="empty">error loading video!</div>}
            >
                {videoToContent}
            </Await>
        </Sidebar>
    );
};

export default WatchSidebar;
