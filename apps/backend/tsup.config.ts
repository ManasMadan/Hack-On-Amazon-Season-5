import { defineConfig } from "tsup";
import tsconfigPaths from "tsconfig-paths";

tsconfigPaths.register();

export default defineConfig((options) => ({
  entry: ["src/**/*.ts"],
  format: ["esm"],
  dts: true,
  ...options,
}));
