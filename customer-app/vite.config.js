import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ command }) => ({
  root: path.resolve(__dirname),
  plugins: [react()],
  base: command === "build" ? "/customer-react/" : "/",
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true
      },
      "/assets": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: path.resolve(__dirname, "../public/customer-react"),
    emptyOutDir: true
  }
}));
