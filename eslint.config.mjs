import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  // Build output, dependencies, and ambient declaration files.
  {
    ignores: ["dist/**", "**/node_modules/**", "**/*.d.ts"],
  },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,

  // Type-aware linting. The repo has several tsconfigs (app / sw / node / server),
  // so list them explicitly — the parser matches each file to the one that
  // includes it. (`projectService` only auto-discovers the default tsconfig.json.)
  {
    languageOptions: {
      parserOptions: {
        project: [
          "./tsconfig.json",
          "./tsconfig.sw.json",
          "./tsconfig.node.json",
          "./restaurant-server/tsconfig.json",
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

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

  // Tests run under jsdom (browser-like) with Vitest. Vitest's matcher and mock
  // APIs (`expect.objectContaining`, `vi.fn`, ...) are intentionally typed as
  // `any`, so the type-aware "unsafe" rules are noise here.
  {
    files: ["src/**/*.test.ts", "src/test-setup.ts"],
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  // Node: the API server, the static server, and the build tooling.
  {
    files: ["restaurant-server/**/*.ts", "serve.ts", "*.config.ts"],
    languageOptions: { globals: { ...globals.node } },
  },

  // The ESLint config itself and any other JS are not part of a TS project.
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
