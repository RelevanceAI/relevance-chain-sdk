import { defineConfig } from "tsup";

export default defineConfig((options) => [
  {
    entry: {
      index: "src/index.ts",
      bin: "src/bin.ts",
      client: "src/client.ts",
    },
    format: ["cjs", "esm"],
    dts: true,
    outDir: "dist",
    clean: true,
    minify: !options.watch,
  },
]);
