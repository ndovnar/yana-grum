import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? "/yana-grum/" : "/",
  plugins: [react(), tailwindcss()],
  test: {
    environment: "node",
  },
});
