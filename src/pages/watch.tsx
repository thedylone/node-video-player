import { FC, useEffect } from "react";
import {
    Link,
    Outlet,
    useLoaderData,
    useRevalidator,
    useSearchParams,
    Await,
} from "react-router";
import { addCount, type videoLoader } from "../api";
import { Video } from "../shared/schema";
import Content from "../components/content";
import SourceLabel from "../components/source";
import { watchedText } from "../components/watched";

/** how often the title was watched, with buttons to change it. */
const WatchCount: FC<{ video: Video }> = ({ video }) => {
    const revalidator = useRevalidator();
    // reload only after the change is saved, so the reload can't return the
    // old value. a newer reload cancels an older one, so the last one wins.
    const changeCount = async (num: number) => {
        await addCount({ id: video.id, num: num });
        revalidator.revalidate();
    };
    return (
        <div className="watch-count">
            <span className="tabular" aria-live="polite">
                {watchedText(video.counter)}
            </span>
            <span className="stepper">
                <button
                    type="button"
                    aria-label="Count one watch less"
                    onClick={() => changeCount(-1)}
                >
                    −1
                </button>
                <button
                    type="button"
                    aria-label="Count one more watch"
                    onClick={() => changeCount(1)}
                >
                    +1
                </button>
            </span>
        </div>
    );
};

const VideoContent: FC<{ video: Video; index: string }> = ({
    video,
    index,
}) => {
    useEffect(() => {
        document.title = video.title;
    }, [video.title]);
    return (
        <main className="main watch-main">
            {video.vids.length === 0 ? (
                <div className="notice">
                    <h1>This title has no videos</h1>
                    <p>
                        Its folder has no video files left. Add some, or delete
                        the title.
                    </p>
                </div>
            ) : (
                <div className="screen">
                    <video
                        src={encodeURI(
                            "/api/stream/" + video.id + "?index=" + index
                        )}
                        controls
                        preload="metadata"
                    ></video>
                </div>
            )}
            <div className="details">
                <SourceLabel source={video.source} />
                <h1 className="watch-title">{video.title}</h1>
                {video.vids.length > 1 && (
                    <p className="watch-part">{video.vids[Number(index)]}</p>
                )}
                <WatchCount video={video} />
            </div>
        </main>
    );
};

const Watch = () => {
    const data = useLoaderData<typeof videoLoader>();
    const index = useSearchParams()[0].get("index") || "0";
    return (
        <Content className="watch">
            <Await
                resolve={data.video}
                errorElement={
                    <div className="notice">
                        <h1>Couldn't load this title</h1>
                        <p>
                            It may have been deleted or renamed. Find it again
                            in the <Link to="/">library</Link>.
                        </p>
                    </div>
                }
            >
                {(video: Video) => (
                    <>
                        <VideoContent video={video} index={index} />
                        <Outlet />
                    </>
                )}
            </Await>
        </Content>
    );
};

export default Watch;
