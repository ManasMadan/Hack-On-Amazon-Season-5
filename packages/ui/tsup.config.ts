import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: ["src/index.ts", "src/components/ui/*.tsx"],
  format: ["esm"],
  dts: true,
  external: ["react"],
  ...options,
}));
