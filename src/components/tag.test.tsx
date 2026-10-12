// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ReactNode } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { addTag, fetchTags, removeTag } from "../api";
import Tag, { TagAdder } from "./tag";

vi.mock("../api");

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(fetchTags).mockResolvedValue([]);
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
        const input = await screen.findByPlaceholderText("Add a tag");
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

    test("Add adds the tag too", async () => {
        vi.mocked(addTag).mockResolvedValue();
        const { input } = await setup();
        fireEvent.change(input, { target: { value: "heist" } });
        fireEvent.click(screen.getByRole("button", { name: "Add" }));
        expect(addTag).toHaveBeenCalledWith({ id: "v1", tag: "heist" });
    });

    test("doesn't add an empty tag", async () => {
        const { input } = await setup();
        fireEvent.change(input, { target: { value: "   " } });
        fireEvent.click(screen.getByRole("button", { name: "Add" }));
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

// P5-02
describe("TagAdder suggestions", () => {
    const options = (input: HTMLElement) =>
        Array.from(
            document.getElementById(input.getAttribute("list")!)!.children,
            (option) => (option as HTMLOptionElement).value
        );

    test("suggests the tags in use, except the title's own", async () => {
        vi.mocked(fetchTags).mockResolvedValue(["crime", "heist", "la"]);
        renderRoute(<TagAdder id="v1" tags={["heist"]} />);
        const input = await screen.findByPlaceholderText("Add a tag");
        expect(fetchTags).not.toHaveBeenCalled();
        fireEvent.focus(input);
        await waitFor(() => expect(options(input)).toEqual(["crime", "la"]));
    });

    test("fetches them again on each focus", async () => {
        vi.mocked(fetchTags).mockResolvedValue(["crime"]);
        renderRoute(<TagAdder id="v1" />);
        const input = await screen.findByPlaceholderText("Add a tag");
        fireEvent.focus(input);
        await waitFor(() => expect(options(input)).toEqual(["crime"]));
        vi.mocked(fetchTags).mockResolvedValue(["crime", "new"]);
        fireEvent.blur(input);
        fireEvent.focus(input);
        await waitFor(() => expect(options(input)).toEqual(["crime", "new"]));
    });

    test("still adds tags when they can't be fetched", async () => {
        vi.mocked(fetchTags).mockRejectedValue(new Error("offline"));
        vi.mocked(addTag).mockResolvedValue();
        renderRoute(<TagAdder id="v1" />);
        const input = await screen.findByPlaceholderText("Add a tag");
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: "heist" } });
        fireEvent.keyDown(input, { key: "Enter" });
        expect(addTag).toHaveBeenCalledWith({ id: "v1", tag: "heist" });
        expect(options(input)).toEqual([]);
    });
});

describe("Tag", () => {
    test("searches for the tag when clicked", async () => {
        const { router } = renderRoute(<Tag id="v1" tag="a b#c" />);
        fireEvent.click(await screen.findByRole("link", { name: "#a b#c" }));
        await waitFor(() =>
            expect(router.state.location.search).toBe(
                "?search=" + encodeURIComponent("a b#c")
            )
        );
    });

    test("the remove button removes the tag, then reloads", async () => {
        const removed = deferred();
        vi.mocked(removeTag).mockReturnValue(removed.promise);
        const { loader } = renderRoute(<Tag id="v1" tag="heist" />);
        fireEvent.click(
            await screen.findByRole("button", { name: "Remove tag heist" })
        );
        expect(removeTag).toHaveBeenCalledWith({ id: "v1", tag: "heist" });
        expect(loader).toHaveBeenCalledTimes(1);
        removed.resolve();
        await waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
    });
});
