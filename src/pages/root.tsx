import { useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router";
import Header from "../components/header";
import { SidebarContext } from "../components/sidebar-context";

const Root = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { pathname } = useLocation();
    // a new page starts with the sidebar closed. done while rendering, not
    // in an effect, so the new page doesn't render once with it open
    const [lastPathname, setLastPathname] = useState(pathname);
    if (pathname !== lastPathname) {
        setLastPathname(pathname);
        setSidebarOpen(false);
    }
    const sidebar = useMemo(
        () => ({
            open: sidebarOpen,
            toggle: () => setSidebarOpen((open) => !open),
        }),
        [sidebarOpen]
    );
    return (
        <SidebarContext.Provider value={sidebar}>
            <Header />
            <Outlet />
        </SidebarContext.Provider>
    );
};

export default Root;
