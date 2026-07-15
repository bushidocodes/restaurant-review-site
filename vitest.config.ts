import { imagetools } from "vite-imagetools";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [imagetools()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    reporters: process.env.CI ? ["github-actions", "verbose"] : ["verbose"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: [
        "src/js/utils.ts",
        "src/js/dbhelper.ts",
        "src/js/imageLoader.ts"
      ],
      thresholds: {
        statements: 95,
        branches: 80,
        functions: 90,
        lines: 95
      }
    }
  }
});
