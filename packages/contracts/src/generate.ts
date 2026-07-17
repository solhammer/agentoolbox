import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import { registry } from "./openapi.js";
// Side-effect import: registers every endpoint before we generate.
import "./index.js";

const document = new OpenApiGeneratorV31(registry.definitions).generateDocument({
  openapi: "3.1.0",
  info: {
    title: "agent-toolbox.ai API",
    version: "0.1.0",
    description:
      "The quality layer for AI agents — deterministic, offline pre-action gates. Each tool returns a PASS/FLAG/BLOCK verdict plus a tamper-evident SHA-256 certificate.",
  },
  servers: [{ url: "https://api.agent-toolbox.ai", description: "Production" }],
});

// Write to the repo root so the API, CI drift-guard, and the Python generator
// all consume a single committed artifact.
const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(here, "../../../openapi.json");
writeFileSync(outPath, JSON.stringify(document, null, 2) + "\n");

const pathCount = Object.keys(document.paths ?? {}).length;
console.log(`✓ openapi.json written to ${outPath} (${pathCount} path(s))`);
