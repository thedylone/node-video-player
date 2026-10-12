import { FC, useId, useRef, useState } from "react";
import { addTag, fetchTags, removeTag } from "../api";
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

/**
 * an input that adds a tag to the title on Enter or +. suggests the tags
 * other titles use, fetched each time it is focused.
 */
export const TagAdder: FC<{ id: string; tags?: string[] }> = ({
    id,
    tags = [],
}) => {
    const revalidator = useRevalidator();
    const [value, setValue] = useState("");
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const listId = useId();
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
                list={listId}
                value={value}
                onFocus={() => {
                    // no suggestions is fine if this fails
                    fetchTags().then(setSuggestions, () => {});
                }}
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
            <datalist id={listId}>
                {suggestions
                    .filter((tag) => !tags.includes(tag))
                    .map((tag) => (
                        <option key={tag} value={tag} />
                    ))}
            </datalist>
            <button type="button" className={styles.add} onClick={submit}>
                +
            </button>
        </div>
    );
};

export default Tag;
