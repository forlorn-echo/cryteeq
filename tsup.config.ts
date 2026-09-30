import { defineConfig } from "tsup";

export default defineConfig({
  entry: { cli: "src/server/cli.ts" },
  format: ["esm"],
  target: "node20",
  outDir: "dist/server",
  banner: { js: "#!/usr/bin/env node" },
  external: ["better-sqlite3", "shiki"],
  clean: true,
  sourcemap: false,
  splitting: false,
});
