import { FC, Suspense } from "react";
import "./sidebar.css";

const Sidebar: FC<{ children?: React.ReactNode }> = (props) => {
    return (
        <div
            className={"flex-col pad-1em no-scrollbar sidebar"}
            style={{ width: "20em" }}
        >
            <Suspense fallback={<div className="empty">loading...</div>}>
                {props.children}
            </Suspense>
        </div>
    );
};

export default Sidebar;
