import { defineConfig } from "vitest/config";

// separate from vite.config.ts, so tests don't load the dev server plugin
export default defineConfig({
    test: {
        // server tests run in node. client tests opt in to a browser-like
        // environment with a "@vitest-environment jsdom" comment
        environment: "node",
        include: ["src/**/*.test.{ts,tsx}"],
        setupFiles: ["src/test-setup.ts"],
    },
});
