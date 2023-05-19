import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    reporters: "verbose",
    typecheck: {
      include: ["src/**/*.test.ts"],
    },
  },
});
