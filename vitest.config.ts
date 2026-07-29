import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["apps/**/*.test.ts", "tools/**/*.test.ts", "packages/**/*.test.ts"],
  },
});
