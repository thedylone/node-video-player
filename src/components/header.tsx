import { Link, Form, useNavigate } from "react-router-dom";
import styles from "./header.module.css";

const Header = () => {
    const navigate = useNavigate();
    return (
        <header className={styles.root}>
            <Link to="/">
                <img
                    className={styles.logo}
                    src="/images/head_l.png"
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
            <div>
                <button className={styles.sidebar_button}>☰</button>
            </div>
        </header>
    );
};

export default Header;
