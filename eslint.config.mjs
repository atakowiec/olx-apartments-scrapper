import {dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {FlatCompat} from "@eslint/eslintrc";

const compat = new FlatCompat({baseDirectory: dirname(fileURLToPath(import.meta.url))});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Node scripts and the VM-based test harness intentionally use CommonJS.
    files: ["scripts/**/*.cjs", "tests/**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@next/next/no-assign-module-variable": "off",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      ".cache/**",
      "logs/**",
    ],
  },
];

export default eslintConfig;
