import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "tests/unit/helpers/empty.ts"),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    environment: "node",
    // unit tests cover the Free/Pro limit logic; open access is tested explicitly
    env: { WITCAR_OPEN_ACCESS: "0" },
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
