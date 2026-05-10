/** ESLint config for Sancti.
 *  Phase 0 of the launch plan installs the actual plugins; until then this
 *  config is a no-op when `eslint` is not on the path, but documents the
 *  intended ruleset so the install + enable step is mechanical.
 */
module.exports = {
  root: true,
  env: { es2022: true, node: true, "react-native/react-native": true },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    project: "./tsconfig.json",
    ecmaFeatures: { jsx: true },
  },
  plugins: ["@typescript-eslint", "react", "react-hooks", "react-native"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:react-native/all",
    "prettier",
  ],
  settings: { react: { version: "detect" } },
  rules: {
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "react-native/no-color-literals": "off",
    "react-native/sort-styles": "off",
  },
  ignorePatterns: ["node_modules/", ".expo/", "dist/", "assets/", "supabase/"],
};
