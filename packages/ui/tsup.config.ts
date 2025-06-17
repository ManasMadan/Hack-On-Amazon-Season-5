import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entryPoints: [
    "src/index.ts",
    "src/components/ui/**/*.ts",
    "src/components/ui/**/*.tsx",
  ],
  format: ["cjs", "esm"],
  dts: true,
  external: ["react"],
  ...options,
}));
