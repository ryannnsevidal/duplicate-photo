import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: ["pix-dupe-detect-main/**", "dist/**", "node_modules/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // Only lint our backend/worker/scripts TS/JS; ignore frontend app under pix-dupe-detect-main
  {
    files: [
      "src/**/*.{ts,tsx}",
      "scripts/**/*.{js,mjs,ts}",
      "migrations/**/*.ts",
    ],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        project: false,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-empty": "off",
    },
  },
  // Ensure Node.js globals (console, process, etc.) are recognized in scripts
  {
    files: ["scripts/**/*.{js,mjs,cjs}", "*.mjs", "*.cjs"],
    languageOptions: {
      globals: globals.node,
      parserOptions: { ecmaVersion: 2022, sourceType: "module" },
    },
  },
];
