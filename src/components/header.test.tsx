// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { expect, test } from "vitest";
import Header from "./header";

const renderHeader = (url = "/") => {
    const router = createMemoryRouter([{ path: "/", element: <Header /> }], {
        initialEntries: [url],
    });
    render(<RouterProvider router={router} />);
    return router;
};

const search = (term: string) => {
    const input = screen.getByPlaceholderText("search");
    fireEvent.change(input, { target: { value: term } });
    fireEvent.submit(input.closest("form")!);
};

// P1-13
test.each(["a?b", "50%", "AC/DC", "#1 hit", "two words", "a&search=b"])(
    "searching for %s keeps the term intact",
    async (term) => {
        const router = renderHeader();
        search(term);
        await waitFor(() => expect(router.state.location.search).not.toBe(""));
        const { pathname, search: query } = router.state.location;
        expect(pathname).toBe("/");
        expect(query).toBe("?search=" + encodeURIComponent(term));
        expect(new URLSearchParams(query).getAll("search")).toEqual([term]);
    }
);

test("an empty search goes to the full gallery", async () => {
    const router = renderHeader("/?search=old");
    search("");
    await waitFor(() => expect(router.state.location.search).toBe(""));
    expect(router.state.location.pathname).toBe("/");
});
