import { FC, Suspense } from "react";
import { useSidebar } from "./sidebar-context";
import "./sidebar.css";

const Sidebar: FC<{ children?: React.ReactNode }> = (props) => {
    const { open } = useSidebar();
    return (
        <div
            className={
                "flex-col pad-1em no-scrollbar sidebar" + (open ? " active" : "")
            }
        >
            <Suspense fallback={<div className="empty">loading...</div>}>
                {props.children}
            </Suspense>
        </div>
    );
};

export default Sidebar;
