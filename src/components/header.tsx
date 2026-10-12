import { Link, Form, useLocation, useNavigate } from "react-router";
import styles from "./header.module.css";
import { useSidebar } from "./sidebar-context";

const SearchIcon = () => (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
        <circle
            cx="8.5"
            cy="8.5"
            r="5.75"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
        />
        <path
            d="M13 13l4.5 4.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
        />
    </svg>
);

const FilterIcon = () => (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
        <path
            d="M3 5h14M6 10h8M8.5 15h3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
        />
    </svg>
);

const Header = () => {
    const navigate = useNavigate();
    const sidebar = useSidebar();
    const location = useLocation();
    const search = new URLSearchParams(location.search).get("search") ?? "";
    // only the gallery's sidebar is a drawer on narrow screens; the watch
    // page shows its sidebar below the video
    const hasDrawer = location.pathname === "/";
    return (
        <header className={styles.root}>
            <Link to="/" className={styles.home} aria-label="Library">
                <img
                    className={styles.logo_large}
                    src="/images/head_l.png"
                    alt=""
                />
                <img
                    className={styles.logo_small}
                    src="/images/head_s.png"
                    alt=""
                />
            </Link>
            <Form
                role="search"
                className={styles.search}
                onSubmit={(e) => {
                    e.preventDefault();
                    const search = String(
                        new FormData(e.currentTarget).get("search") ?? ""
                    );
                    navigate(
                        search ? `/?search=${encodeURIComponent(search)}` : "/"
                    );
                }}
            >
                <input
                    // shows the current search, also after back and forward
                    key={search}
                    defaultValue={search}
                    className={styles.search_input}
                    type="search"
                    name="search"
                    placeholder="Search titles and tags"
                    aria-label="Search titles and tags"
                    autoCorrect="off"
                    spellCheck="false"
                />
                <button className={styles.search_button} aria-label="Search">
                    <SearchIcon />
                </button>
            </Form>
            {hasDrawer && (
                <button
                    type="button"
                    className={styles.sidebar_button}
                    onClick={sidebar.toggle}
                    aria-expanded={sidebar.open}
                    aria-controls="sidebar"
                >
                    <FilterIcon />
                    Filters
                </button>
            )}
        </header>
    );
};

export default Header;
