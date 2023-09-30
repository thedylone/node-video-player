import { Form, useLoaderData, useSubmit } from "react-router-dom";
import Sidebar from "../components/sidebar";
import styles from "./gallery-sidebar.module.css";

const GallerySidebar = () => {
    const sources = useLoaderData() as string[];
    const submit = useSubmit();
    return (
        <Sidebar>
            <h2>Sources</h2>
            <Form
                className={styles.form}
                action="/"
                method="get"
                onChange={(e) => {
                    submit(e.currentTarget);
                }}
            >
                {sources.map((source, index) => (
                    <label className={styles.label} key={index}>
                        <input
                            className={styles.checkbox}
                            type="checkbox"
                            name="filter"
                            value={source}
                        />
                        {source}
                    </label>
                ))}
            </Form>
        </Sidebar>
    );
};

export default GallerySidebar;
