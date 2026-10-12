import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "../components/header";
import { SidebarContext } from "../components/sidebar-context";

const Root = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { pathname } = useLocation();
    // a new page starts with the sidebar closed
    useEffect(() => setSidebarOpen(false), [pathname]);
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
