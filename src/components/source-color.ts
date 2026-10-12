import { CSSProperties } from "react";

/**
 * a hue (0-359) for a source, the same every time for the same name, so each
 * source keeps its colour across pages and visits.
 */
export const sourceHue = (source: string) => {
    let hash = 0;
    for (const char of source) {
        hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
    }
    // spread neighbouring hashes around the wheel (golden angle)
    return Math.round((hash * 137.508) % 360);
};

/** sets --hue for the element, which the source styles read. */
export const sourceStyle = (source: string) =>
    ({ "--hue": sourceHue(source) }) as CSSProperties;
