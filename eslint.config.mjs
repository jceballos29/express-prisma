// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import pluginImport from "eslint-plugin-import";
import pluginPrettier from "eslint-plugin-prettier";
import pluginSecurity from "eslint-plugin-security";
import pluginPromise from "eslint-plugin-promise";

/**
 * Configuración moderna y completa para proyectos TypeScript + Prettier
 * Compatible con ESLint v9 (Flat Config)
 */
export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,

  {
    plugins: {
      import: pluginImport,
      prettier: pluginPrettier,
      security: pluginSecurity,
      promise: pluginPromise,
    },

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: tseslint.parser,
      parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },

    ignores: [
      "node_modules",
      "dist",
      "build",
      "coverage",
      "public",
      "*.config.js",
      "*.config.ts",
      "eslint.config.mjs",
      "prisma/",
      "scripts/",
    ],

    rules: {
      // Prettier
      "prettier/prettier": "error",

      // Estilo
      quotes: ["error", "single"],
      semi: ["error", "always"],
      "no-trailing-spaces": "error",
      "eol-last": ["error", "always"],

      // TypeScript
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-inferrable-types": "off",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],
      "@typescript-eslint/no-floating-promises": "error",

      // Imports
      "import/order": [
        "warn",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            ["parent", "sibling"],
            "index",
          ],
          pathGroups: [{ pattern: "@/**", group: "internal" }],
          alphabetize: { order: "asc", caseInsensitive: true },
          "newlines-between": "always",
        },
      ],

      // Buenas prácticas
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "prefer-const": "error",
      eqeqeq: ["error", "always"],

      // Promesas
      "promise/catch-or-return": ["error", { allowFinally: true }],
      "promise/param-names": "error",

      // Seguridad
      "security/detect-eval-with-expression": "error",
      "security/detect-non-literal-regexp": "warn",
    },
  },
];
