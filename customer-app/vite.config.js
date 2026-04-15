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
      "/api": "http://localhost:3001",
      "/assets": "http://localhost:3001"
    }
  },
  build: {
    outDir: path.resolve(__dirname, "../public/customer-react"),
    emptyOutDir: true
  }
}));
