import { FC, useId, useRef, useState } from "react";
import { Link, useRevalidator } from "react-router";
import { addTag, fetchTags, removeTag } from "../api";
import styles from "./tag.module.css";

/** the gallery searching for a tag. */
const searchFor = (tag: string) => `/?search=${encodeURIComponent(tag)}`;

/** a tag that searches for itself when clicked. */
export const TagLink: FC<{ tag: string }> = ({ tag }) => (
    <Link className={styles.link} to={searchFor(tag)}>
        #{tag}
    </Link>
);

/** one of a title's tags, which searches for itself or can be removed. */
const Tag: FC<{ id: string; tag: string }> = ({ id, tag }) => {
    const revalidator = useRevalidator();
    return (
        <span className={styles.tag}>
            <Link className={styles.name} to={searchFor(tag)} title={tag}>
                #{tag}
            </Link>
            <button
                type="button"
                className={styles.remove}
                aria-label={`Remove tag ${tag}`}
                onClick={async () => {
                    await removeTag({ id, tag });
                    revalidator.revalidate();
                }}
            >
                <svg
                    viewBox="0 0 12 12"
                    width="10"
                    height="10"
                    aria-hidden="true"
                >
                    <path
                        d="M2 2l8 8M10 2l-8 8"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                    />
                </svg>
            </button>
        </span>
    );
};

/**
 * an input that adds a tag to the title on Enter or Add. suggests the tags
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
        <div className={styles.adder}>
            <input
                ref={inputRef}
                type="text"
                className={styles.input}
                placeholder="Add a tag"
                aria-label="Add a tag"
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
                Add
            </button>
        </div>
    );
};

export default Tag;
