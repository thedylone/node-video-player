import { Outlet } from "react-router-dom";
import Header from "../components/header";
import styles from "./root.module.css";

const Root = () => {
    return (
        <>
            <Header />
            <div className={styles.content}>
                <Outlet />
            </div>
        </>
    );
};

export default Root;
