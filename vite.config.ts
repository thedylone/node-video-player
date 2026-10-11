import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import express from './express-plugin'

// https://vitejs.dev/config/
export default defineConfig(({ ssrBuild }) => ({
  plugins: [react(), express('src/server')],
  // the server bundle (build:server) does not need the public folder
  build: ssrBuild ? { copyPublicDir: false } : {},
}))
