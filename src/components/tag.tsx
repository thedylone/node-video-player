import { FC, useRef, useState } from "react";
import { addTag, removeTag } from "../api";
import styles from "./tag.module.css";
import { useNavigate, useRevalidator } from "react-router";

const Tag: FC<{ id: string; tag: string }> = ({ id, tag }) => {
    const navigate = useNavigate();
    const revalidator = useRevalidator();
    return (
        <div className={styles.tag}>
            <input
                type="text"
                className={styles.input}
                value={tag}
                title={tag}
                readOnly
                onClick={() => {
                    navigate(`/?search=${encodeURIComponent(tag)}`);
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
    const [value, setValue] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const submit = async () => {
        const tag = value.trim();
        if (!tag) {
            inputRef.current?.focus();
            return;
        }
        await addTag({ id: id, tag: tag });
        setValue("");
        revalidator.revalidate();
    };
    return (
        <div className={styles.tag}>
            <input
                ref={inputRef}
                type="text"
                className={styles.input}
                placeholder="add tag"
                value={value}
                onChange={(e) => {
                    // don't let the surrounding <Form> submit on every key
                    e.stopPropagation();
                    setValue(e.target.value);
                }}
                onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    // add the tag instead of submitting the surrounding <Form>
                    e.preventDefault();
                    submit();
                }}
            />
            <button type="button" className={styles.add} onClick={submit}>
                +
            </button>
        </div>
    );
};

export default Tag;
