import { FC } from "react";
import styles from "./sidebar.module.css";

const Sidebar: FC<{ children?: React.ReactNode }> = (props) => {
    return <div className={styles.sidebar}>{props.children}</div>;
};

export default Sidebar;
