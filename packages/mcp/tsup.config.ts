import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node20",
  bundle: true,
  clean: true,
  dts: false,
  sourcemap: false,
  // Minify the published bundle so inlined workspace source (including the
  // proprietary finance toolkit) is not shipped as readable source.
  minify: true,
  // Inline the unpublished workspace packages so the published npm package
  // is fully self-contained (no workspace:* references leak to consumers).
  noExternal: [/^@agentoolbox\//],
  // Keep the published MCP SDK as a normal runtime dependency (installed via npm).
  external: ["@modelcontextprotocol/sdk"],
  // Some bundled CJS deps (e.g. Solana's bs58 -> safe-buffer) call require("buffer").
  // Provide a real require() in the ESM output so those dynamic requires resolve.
  banner: {
    js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);',
  },
});
