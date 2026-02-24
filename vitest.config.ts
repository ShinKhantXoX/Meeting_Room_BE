import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
    setupFiles: [path.resolve(__dirname, "src/__tests__/setup.ts")],
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? "file:./test.db",
      JWT_SECRET: process.env.JWT_SECRET ?? "test-secret",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
