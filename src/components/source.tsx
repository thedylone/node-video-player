import { FC } from "react";
import { sourceStyle } from "./source-color";
import styles from "./source.module.css";

/** the source's name on a label in its colour. */
const SourceLabel: FC<{ source: string }> = ({ source }) => (
    <span className={styles.label} style={sourceStyle(source)} title={source}>
        {source}
    </span>
);

export default SourceLabel;
