import { FC } from "react";
import { addTag, removeTag } from "../server/api";
import styles from "./tag.module.css";

const Tag: FC<{ id: string; tag: string }> = ({ id, tag }) => {
    return (
        <div className={styles.tag}>
            <input
                type="text"
                className={styles.input}
                defaultValue={tag}
                title={tag || "Type to add a tag"}
                disabled={tag !== ""}
                onBlur={async (e) => {
                    const newTag = e.target.value;
                    if (newTag === "") {
                        return;
                    }
                    await removeTag({ id, tag: "" });
                    await addTag({ id, tag: newTag });
                    e.target.disabled = true;
                }}
            />
            <button
                type="submit"
                className={styles.remove}
                onClick={async () => {
                    await removeTag({ id, tag });
                }}
            >
                ✕
            </button>
        </div>
    );
};

export const TagAdder: FC<{ id: string }> = ({ id }) => {
    return (
        <button
            type="submit"
            onClick={async () => {
                await addTag({ id: id, tag: "" });
            }}
        >
            +
        </button>
    );
};

export default Tag;
