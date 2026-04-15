import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const apiTarget = process.env.CK_API_TARGET || "http://localhost:3001";

export default defineConfig(({ command }) => ({
  root: path.resolve(__dirname),
  plugins: [react()],
  base: command === "build" ? "/admin-react/" : "/",
  server: {
    port: 5173,
    proxy: {
      "/api": apiTarget,
      "/assets": apiTarget
    }
  },
  build: {
    outDir: path.resolve(__dirname, "../public/admin-react"),
    emptyOutDir: true
  }
}));
