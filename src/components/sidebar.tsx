import { FC, Suspense } from "react";
import { useSidebar } from "./sidebar-context";
import "./sidebar.css";

/**
 * the column beside the page's main content. on narrow screens it is a
 * drawer the header's Filters button opens, or, if stacked, it sits below
 * the main content.
 */
const Sidebar: FC<{ children?: React.ReactNode; stacked?: boolean }> = ({
    children,
    stacked = false,
}) => {
    const { open, toggle } = useSidebar();
    return (
        <>
            {!stacked && (
                // closes the drawer when the page around it is clicked
                <div
                    className={"sidebar-scrim" + (open ? " active" : "")}
                    onClick={toggle}
                    aria-hidden="true"
                />
            )}
            <aside
                id="sidebar"
                className={
                    "sidebar" +
                    (stacked ? " stacked" : "") +
                    (open ? " active" : "")
                }
            >
                <Suspense fallback={<p className="notice">Loading…</p>}>
                    {children}
                </Suspense>
            </aside>
        </>
    );
};

export default Sidebar;
