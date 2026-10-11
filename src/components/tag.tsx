import { FC } from "react";
import { addTag, removeTag } from "../server/api";
import styles from "./tag.module.css";
import { useNavigate, useRevalidator } from "react-router-dom";

const Tag: FC<{ id: string; tag: string }> = ({ id, tag }) => {
    const navigate = useNavigate();
    const revalidator = useRevalidator();
    return (
        <div className={styles.tag}>
            <input
                type="text"
                className={styles.input}
                defaultValue={tag}
                title={tag || "Type to add a tag"}
                readOnly={tag !== ""}
                onBlur={async (e) => {
                    const newTag = e.target.value;
                    if (newTag === "") {
                        return;
                    }
                    await removeTag({ id, tag: "" });
                    await addTag({ id, tag: newTag });
                    e.target.readOnly = true;
                    revalidator.revalidate();
                }}
                onClick={(e) => {
                    if (e.currentTarget.readOnly) navigate(`/search/${e.currentTarget.value}`);
                }}
            />
            <button
                type="button"
                className={styles.remove}
                onClick={async () => {
                    await removeTag({ id, tag });
                    revalidator.revalidate();
                }}
            >
                ✕
            </button>
        </div>
    );
};

export const TagAdder: FC<{ id: string }> = ({ id }) => {
    const revalidator = useRevalidator();
    return (
        <button
            type="button"
            onClick={async () => {
                await addTag({ id: id, tag: "" });
                revalidator.revalidate();
            }}
        >
            +
        </button>
    );
};

export default Tag;
