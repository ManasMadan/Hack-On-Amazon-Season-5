import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: [
    "src/index.ts",
    "src/components/ui/button.tsx",
    "src/components/ui/card.tsx",
    "src/components/ui/dropdown-menu.tsx",
  ],
  format: ["esm"],
  dts: true,
  external: ["react"],
  ...options,
}));
