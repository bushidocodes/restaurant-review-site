import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  // Build output, dependencies, and the Vite-generated SW bundle.
  {
    ignores: ["dist/**", "**/node_modules/**", "**/*.d.ts"],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Allow underscore-prefixed names to be intentionally unused (matches the
  // tsconfig noUnusedLocals/noUnusedParameters convention used in the code).
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },

  // Browser front-end.
  {
    files: ["src/**/*.ts"],
    ignores: ["src/sw.ts", "src/**/*.test.ts", "src/test-setup.ts"],
    languageOptions: { globals: { ...globals.browser } },
  },

  // Service worker — browser + service-worker globals (`self`, `clients`, ...).
  {
    files: ["src/sw.ts"],
    languageOptions: { globals: { ...globals.browser, ...globals.serviceworker } },
  },

  // Tests run under jsdom (browser-like) with Vitest.
  {
    files: ["src/**/*.test.ts", "src/test-setup.ts"],
    languageOptions: { globals: { ...globals.browser } },
  },

  // Node: the API server, the static server, and the build tooling.
  {
    files: ["restaurant-server/**/*.ts", "serve.ts", "*.config.ts"],
    languageOptions: { globals: { ...globals.node } },
  },
);
