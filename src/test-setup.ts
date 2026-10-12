/**
 * setup for every test file. only does anything in jsdom tests.
 */
import { afterEach } from "vitest";

if (typeof window !== "undefined") {
    // React Router builds Requests with jsdom's AbortSignal, which Node's
    // Request rejects. build them without it, then put the signal back:
    // the router reads it to drop the results of cancelled navigations
    const NodeRequest = globalThis.Request;
    globalThis.Request = class Request extends NodeRequest {
        constructor(input: RequestInfo | URL, init?: RequestInit) {
            super(input, { ...init, signal: undefined });
            if (init?.signal) {
                Object.defineProperty(this, "signal", { value: init.signal });
            }
        }
    };

    // imported here, so server tests don't load React
    const { cleanup } = await import("@testing-library/react");
    afterEach(cleanup);
}
