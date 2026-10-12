// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { expect, test } from "vitest";
import Sidebar from "../components/sidebar";
import Root from "./root";

const renderRoot = () => {
    const router = createMemoryRouter([
        {
            path: "/",
            element: <Root />,
            children: [
                { index: true, element: <Sidebar>gallery sidebar</Sidebar> },
                {
                    path: "watch/:id",
                    element: <Sidebar>watch sidebar</Sidebar>,
                },
            ],
        },
    ]);
    render(<RouterProvider router={router} />);
    return router;
};

const isOpen = (text: string) =>
    screen.getByText(text).classList.contains("active");

const toggle = () =>
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));

// P2-08
test("Filters opens and closes the sidebar", async () => {
    renderRoot();
    await screen.findByText("gallery sidebar");
    expect(isOpen("gallery sidebar")).toBe(false);
    toggle();
    expect(isOpen("gallery sidebar")).toBe(true);
    toggle();
    expect(isOpen("gallery sidebar")).toBe(false);
});

test("a new page starts with the sidebar closed", async () => {
    const router = renderRoot();
    await screen.findByText("gallery sidebar");
    toggle();
    await act(() => router.navigate("/watch/v1"));
    expect(isOpen("watch sidebar")).toBe(false);
    // and so does going back
    await act(() => router.navigate(-1));
    expect(isOpen("gallery sidebar")).toBe(false);
});

// P5-05: the watch page shows its sidebar below the video instead
test("only the gallery has a Filters button", async () => {
    const router = renderRoot();
    await screen.findByText("gallery sidebar");
    expect(screen.getByRole("button", { name: "Filters" })).toBeTruthy();
    await act(() => router.navigate("/watch/v1"));
    expect(screen.queryByRole("button", { name: "Filters" })).toBeNull();
});

// P5-05
test("clicking beside the open drawer closes it", async () => {
    renderRoot();
    await screen.findByText("gallery sidebar");
    toggle();
    fireEvent.click(document.querySelector(".sidebar-scrim")!);
    expect(isOpen("gallery sidebar")).toBe(false);
});

test("filtering the same page keeps it open", async () => {
    const router = renderRoot();
    await screen.findByText("gallery sidebar");
    toggle();
    await act(() => router.navigate("/?filter=films"));
    expect(isOpen("gallery sidebar")).toBe(true);
});
