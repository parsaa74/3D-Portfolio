import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/tests/setup.js"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@utils": resolve(__dirname, "src/utils"),
      "@core": resolve(__dirname, "src/core"),
      "@systems": resolve(__dirname, "src/systems"),
    },
  },
});
