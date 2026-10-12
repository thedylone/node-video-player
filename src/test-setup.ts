/**
 * setup for every test file.
 */
import { afterEach } from "vitest";

// Testing Library only unmounts after each test by itself when test globals
// are on. imported only in jsdom tests, so server tests don't load React
if (typeof window !== "undefined") {
    const { cleanup } = await import("@testing-library/react");
    afterEach(cleanup);
}
