import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import express from "./express-plugin.ts";

// https://vitejs.dev/config/
export default defineConfig(({ isSsrBuild }) => ({
    plugins: [react(), express("src/server/app.ts")],
    // the server bundle (build:server) does not need the public folder
    build: isSsrBuild ? { copyPublicDir: false } : {},
}));
