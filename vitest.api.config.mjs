import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import baseConfig from "./vitest.config.mjs";

export default defineConfig({
  test: {
    ...baseConfig.test,
    include: ["tests/api/**/*.test.js"],
    exclude: [],
    globalSetup: ["tests/api/global-setup.js"],
    hookTimeout: 120000,
    testTimeout: 15000,
    sequence: {
      shuffle: false,
      concurrent: false,
    },
  },
  resolve: baseConfig.resolve,
});