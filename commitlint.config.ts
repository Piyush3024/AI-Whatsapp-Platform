import type { UserConfig } from "@commitlint/types";

const config: UserConfig = {
  extends: ["@commitlint/config-conventional"],
  ignores: [
    (commit) => commit.startsWith("Merge"),
    (commit) => commit === "Initial commit",
    (commit) => commit.includes("[skip ci]"),
  ],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "ci",
        "chore",
        "revert",
      ],
    ],
    "scope-enum": [
      2,
      "always",
      [
        "web",
        "api",
        "db",
        "worker",
        "ui",
        "auth",
        "billing",
        "bookings",
        "customers",
        "settings",
        "tests",
        "ci",
        "docs",
      ],
    ],
    "subject-case": [2, "always", "sentence-case"],
  },
};

export default config;