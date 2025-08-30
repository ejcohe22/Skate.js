import { defineConfig } from "vite";
export default defineConfig({
  base: "/Skate.js/",
  test: {
    setupFiles: ["./tests/setup.ts"],
    environment: "happy-dom",
  },
});
