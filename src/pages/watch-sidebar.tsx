import { FC } from "react";
import {
    Await,
    useNavigate,
    useRevalidator,
    useRouteLoaderData,
    useSearchParams,
} from "react-router";
import { Video } from "../shared/schema";
import { addCount, deleteVideo, type videoLoader } from "../api";
import Sidebar from "../components/sidebar";
import Tag, { TagAdder } from "../components/tag";

const VideoDetails: FC<{ video: Video }> = ({ video }) => {
    const navigate = useNavigate();
    const revalidator = useRevalidator();
    const current = Number(useSearchParams()[0].get("index") || 0);
    // reload only after the change is saved, so the reload can't return the
    // old value. a newer reload cancels an older one, so the last one wins.
    const changeCount = async (num: number) => {
        await addCount({ id: video.id, num: num });
        revalidator.revalidate();
    };
    return (
        <>
            <div>
                <h2>{video.title}</h2>
                <h3 className="subtitle">{video.source}</h3>
            </div>
            <div>
                <h2>Videos</h2>
                {/* remount when the index changes (e.g. back button), so the
                    checked radio follows the URL */}
                <div className="flex-col" key={current}>
                    {video.vids.map((vid, index) => (
                        <label key={vid}>
                            <input
                                type="radio"
                                name="index"
                                value={index}
                                defaultChecked={index === current}
                            />
                            {vid}
                        </label>
                    ))}
                </div>
            </div>
            <div>
                <h2>Count: {video.counter}</h2>
                <button type="button" onClick={() => changeCount(-1)}>
                    -1
                </button>
                <button type="button" onClick={() => changeCount(1)}>
                    +1
                </button>
                <button
                    type="button"
                    onClick={async () => {
                        const message = `Delete "${video.title}"? This deletes its folder from disk.`;
                        if (!confirm(message)) return;
                        try {
                            await deleteVideo({ id: video.id });
                        } catch (error) {
                            alert("Could not delete the video: " + error);
                            return;
                        }
                        navigate("/");
                    }}
                >
                    delete video
                </button>
            </div>
            <div>
                <h2>Tags</h2>
                <div className="flex-row">
                    {video.tags.map((tag) => (
                        <Tag key={tag} id={video.id} tag={tag} />
                    ))}
                    <TagAdder id={video.id} />
                </div>
            </div>
        </>
    );
};

const WatchSidebar = () => {
    // loaded once by the parent watch route, which renders first
    const data = useRouteLoaderData<typeof videoLoader>("watch")!;
    return (
        <Sidebar>
            <Await
                resolve={data.video}
                errorElement={<div className="empty">error loading video!</div>}
            >
                {(video: Video) => <VideoDetails video={video} />}
            </Await>
        </Sidebar>
    );
};

export default WatchSidebar;
