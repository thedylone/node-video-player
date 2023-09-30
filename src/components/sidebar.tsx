import { FC } from "react";
import "./sidebar.css";

const Sidebar: FC<{ children?: React.ReactNode }> = (props) => {
    return (
        <div
            className={"flex-col pad-1em no-scrollbar sidebar"}
            style={{ width: "20em" }}
        >
            {props.children}
        </div>
    );
};

export default Sidebar;
