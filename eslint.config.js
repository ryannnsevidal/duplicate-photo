import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: ["pix-dupe-detect-main/**", "dist/**", "node_modules/**"],
  },
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];
