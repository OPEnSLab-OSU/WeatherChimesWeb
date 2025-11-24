import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        // Browser-loaded libraries
        Tone: "readonly",
        Plotly: "readonly",
      },
    },
    rules: {
      // Ignore unused params starting with "_"
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    },
  },
]);