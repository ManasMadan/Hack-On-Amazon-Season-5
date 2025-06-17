import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: ["src/**/*.ts"],
  format: ["esm"],
  dts: true,
  ...options,
}));
