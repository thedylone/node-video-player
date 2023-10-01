import { Link, Form, useNavigate } from "react-router-dom";
import styles from "./header.module.css";

const toggleSidebar = () => {
    // add "active" class to sidebar
    document.getElementById("sidebar")?.classList.toggle("active");
};

const Header = () => {
    const navigate = useNavigate();
    return (
        <header className={styles.root}>
            <Link to="/" style={{ textAlign: "left" }}>
                <img
                    className={styles.logo + " " + styles.logo_large}
                    src="/images/head_l.png"
                    alt="video player logo"
                />
                <img
                    className={styles.logo + " " + styles.logo_small}
                    src="/images/head_s.png"
                    alt="video player logo"
                />
            </Link>
            <Form
                className={styles.search}
                onSubmit={(e) => {
                    e.preventDefault();
                    const search = e.currentTarget.search.value;
                    if (search) navigate(`/search/${search}`);
                }}
            >
                <input
                    className={styles.search_input}
                    type="text"
                    name="search"
                    placeholder="search"
                    autoCorrect="off"
                    spellCheck="false"
                />
                <button className={styles.search_button}>
                    &#x1F50E;&#xFE0E;
                </button>
            </Form>
            <div style={{ display: "flex", justifyContent: "end" }}>
                <button
                    className={styles.sidebar_button}
                    onClick={toggleSidebar}
                >
                    ☰
                </button>
            </div>
        </header>
    );
};

export default Header;
