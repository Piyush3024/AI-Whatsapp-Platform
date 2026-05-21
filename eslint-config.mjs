import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/build/**",
    ],
  },
  {
    rules: {
      "no-unused-vars": "warn",
      "no-console": "warn",
    },
  },
];