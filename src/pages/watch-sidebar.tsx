import { FC } from "react";
import {
    Await,
    useNavigate,
    useRouteLoaderData,
    useSearchParams,
} from "react-router";
import { Video } from "../shared/schema";
import { deleteVideo, type videoLoader } from "../api";
import Sidebar from "../components/sidebar";
import Tag, { TagAdder } from "../components/tag";

const VideoDetails: FC<{ video: Video }> = ({ video }) => {
    const navigate = useNavigate();
    const current = Number(useSearchParams()[0].get("index") || 0);
    return (
        <>
            {video.vids.length > 1 && (
                // remount when the index changes (e.g. back button), so the
                // checked radio follows the URL
                <fieldset className="choices parts" key={current}>
                    <legend className="heading">Parts</legend>
                    {video.vids.map((vid, index) => (
                        <label key={vid} className="part">
                            <input
                                className="visually-hidden"
                                type="radio"
                                name="index"
                                value={index}
                                defaultChecked={index === current}
                            />
                            <span>{vid}</span>
                        </label>
                    ))}
                </fieldset>
            )}
            <section>
                <h2 className="heading">Tags</h2>
                <div className="tag-list">
                    {video.tags.map((tag) => (
                        <Tag key={tag} id={video.id} tag={tag} />
                    ))}
                </div>
                <TagAdder id={video.id} tags={video.tags} />
            </section>
            <section className="danger-zone">
                <button
                    type="button"
                    className="danger"
                    onClick={async () => {
                        const message = `Delete "${video.title}"? This deletes its folder from disk.`;
                        if (!confirm(message)) return;
                        try {
                            await deleteVideo({ id: video.id });
                        } catch (error) {
                            alert("Could not delete the title: " + error);
                            return;
                        }
                        navigate("/");
                    }}
                >
                    Delete title…
                </button>
                <p>Deletes its folder and videos from disk.</p>
            </section>
        </>
    );
};

const WatchSidebar = () => {
    // loaded once by the parent watch route, which renders first
    const data = useRouteLoaderData<typeof videoLoader>("watch")!;
    return (
        <Sidebar stacked>
            <Await resolve={data.video}>
                {(video: Video) => <VideoDetails video={video} />}
            </Await>
        </Sidebar>
    );
};

export default WatchSidebar;
