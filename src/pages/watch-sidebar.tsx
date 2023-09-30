import { Form, Link, useLoaderData } from "react-router-dom";
import { Video } from "../server/schema";
import { addCount } from "../server/api";
import Sidebar from "../components/sidebar";
import Tag, { TagAdder } from "../components/tag";
import styles from "./watch-sidebar.module.css";

const WatchSidebar = () => {
    const video = useLoaderData() as Video;
    return (
        <Sidebar>
            <div>
                <h2 className={styles.title}>{video.title}</h2>
                <h3 className={styles.subtitle}>{video.source}</h3>
            </div>
            <div>
                <h2>Videos</h2>
                {video.vids.map((vid, index) => (
                    <Link
                        key={index}
                        to={`/watch?id=${video.id}&index=${index}`}
                    >
                        <input
                            className={styles.radio}
                            type="radio"
                            name="vid"
                            value={vid}
                            defaultChecked={index === 0}
                        />
                        {vid}
                    </Link>
                ))}
            </div>
            <div>
                <h2>Count: {video.counter}</h2>
                <Form className={styles.form}>
                    <input type="hidden" name="id" value={video.id} />
                    <button
                        type="submit"
                        name="num"
                        value="-1"
                        onClick={() => {
                            addCount({ id: video.id, num: -1 });
                        }}
                    >
                        -1
                    </button>
                    <button
                        type="submit"
                        name="num"
                        value="1"
                        onClick={() => {
                            addCount({ id: video.id, num: 1 });
                        }}
                    >
                        +1
                    </button>
                </Form>
            </div>
            <div>
                <h2>Tags</h2>
                <Form className={styles.tag_container}>
                    <input type="hidden" name="id" value={video.id} />
                    {video.tags.map((tag, index) => (
                        <Tag key={index} id={video.id} tag={tag} />
                    ))}
                    <TagAdder id={video.id} />
                </Form>
            </div>
        </Sidebar>
    );
};

export default WatchSidebar;
