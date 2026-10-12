// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ReactNode } from "react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { addTag, removeTag } from "../api";
import Tag, { TagAdder } from "./tag";

vi.mock("../api");

beforeEach(() => {
    vi.resetAllMocks();
});

/** a promise the test resolves, standing in for a slow request. */
const deferred = () => {
    let resolve!: () => void;
    const promise = new Promise<void>((r) => (resolve = r));
    return { promise, resolve };
};

/**
 * renders the element inside a form (like the page's content form) on a
 * route whose loader counts how often the data is reloaded.
 */
const renderRoute = (element: ReactNode) => {
    const loader = vi.fn(() => null);
    const formChange = vi.fn();
    const router = createMemoryRouter([
        {
            path: "/",
            loader,
            element: <form onChange={formChange}>{element}</form>,
        },
    ]);
    render(<RouterProvider router={router} />);
    return { router, loader, formChange };
};

// P1-14
describe("TagAdder", () => {
    const setup = async () => {
        const route = renderRoute(<TagAdder id="v1" />);
        const input = await screen.findByPlaceholderText("add tag");
        return { ...route, input: input as HTMLInputElement };
    };

    test("adds the trimmed tag on Enter, then clears and reloads", async () => {
        vi.mocked(addTag).mockResolvedValue();
        const { input, loader, formChange } = await setup();
        fireEvent.change(input, { target: { value: "  heist " } });
        // typing doesn't submit the page's form
        expect(formChange).not.toHaveBeenCalled();
        // Enter adds the tag instead of submitting the form
        expect(fireEvent.keyDown(input, { key: "Enter" })).toBe(false);
        expect(addTag).toHaveBeenCalledWith({ id: "v1", tag: "heist" });
        await waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
        expect(input.value).toBe("");
    });

    test("+ adds the tag too", async () => {
        vi.mocked(addTag).mockResolvedValue();
        const { input } = await setup();
        fireEvent.change(input, { target: { value: "heist" } });
        fireEvent.click(screen.getByText("+"));
        expect(addTag).toHaveBeenCalledWith({ id: "v1", tag: "heist" });
    });

    test("doesn't add an empty tag", async () => {
        const { input } = await setup();
        fireEvent.change(input, { target: { value: "   " } });
        fireEvent.click(screen.getByText("+"));
        fireEvent.keyDown(input, { key: "Enter" });
        expect(addTag).not.toHaveBeenCalled();
        expect(document.activeElement).toBe(input);
    });

    // P1-12
    test("reloads only after the tag is saved", async () => {
        const saved = deferred();
        vi.mocked(addTag).mockReturnValue(saved.promise);
        const { input, loader } = await setup();
        fireEvent.change(input, { target: { value: "heist" } });
        fireEvent.keyDown(input, { key: "Enter" });
        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(loader).toHaveBeenCalledTimes(1);
        saved.resolve();
        await waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
    });
});

describe("Tag", () => {
    test("searches for the tag when clicked", async () => {
        const { router } = renderRoute(<Tag id="v1" tag="a b#c" />);
        fireEvent.click(await screen.findByDisplayValue("a b#c"));
        await waitFor(() =>
            expect(router.state.location.search).toBe(
                "?search=" + encodeURIComponent("a b#c")
            )
        );
    });

    test("✕ removes the tag, then reloads", async () => {
        const removed = deferred();
        vi.mocked(removeTag).mockReturnValue(removed.promise);
        const { loader } = renderRoute(<Tag id="v1" tag="heist" />);
        fireEvent.click(await screen.findByText("✕"));
        expect(removeTag).toHaveBeenCalledWith({ id: "v1", tag: "heist" });
        expect(loader).toHaveBeenCalledTimes(1);
        removed.resolve();
        await waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
    });
});
