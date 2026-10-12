import { describe, expect, test } from "vitest";
import { sourceHue } from "./source-color";
import { watchedText } from "./watched";

// P5-05
describe("sourceHue", () => {
    test("is the same for the same source", () => {
        expect(sourceHue("films")).toBe(sourceHue("films"));
    });

    test.each(["", "films", "shows", "すいせい", "a".repeat(500)])(
        "is a whole number from 0 to 359 for %j",
        (source) => {
            const hue = sourceHue(source);
            expect(Number.isInteger(hue)).toBe(true);
            expect(hue).toBeGreaterThanOrEqual(0);
            expect(hue).toBeLessThan(360);
        }
    );

    test("tells similar names apart", () => {
        const hues = new Set(["a", "b", "c", "d", "e"].map(sourceHue));
        expect(hues.size).toBe(5);
    });
});

// P5-05
test.each([
    [0, "Not watched yet"],
    [1, "Watched once"],
    [2, "Watched 2 times"],
    [-1, "Watched -1 times"],
])("watchedText(%i) is %j", (count, text) => {
    expect(watchedText(count)).toBe(text);
});
