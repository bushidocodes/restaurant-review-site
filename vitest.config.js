import { defineConfig } from "vitest/config";
import { imagetools } from "vite-imagetools";

export default defineConfig({
  plugins: [imagetools()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.js"],
    reporters: process.env.CI ? ["github-actions", "verbose"] : ["verbose"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/js/utils.js", "src/js/dbhelper.js", "src/js/imageLoader.js"],
      thresholds: {
        statements: 95,
        branches: 80,
        functions: 90,
        lines: 95,
      },
    },
  },
});
