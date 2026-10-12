import { createContext, useContext } from "react";

type SidebarState = { open: boolean; toggle: () => void };

/**
 * whether the sidebar is shown on narrow screens, where it slides in from
 * the right. provided by Root, toggled by the header button.
 */
export const SidebarContext = createContext<SidebarState>({
    open: false,
    toggle: () => {},
});

export const useSidebar = () => useContext(SidebarContext);
