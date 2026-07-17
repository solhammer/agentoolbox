import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { getOpenApiDocument } from "./index.js";

const document = getOpenApiDocument();

// Write to the repo root so the API, CI drift-guard, and the Python generator
// all consume a single committed artifact.
const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(here, "../../../openapi.json");
writeFileSync(outPath, JSON.stringify(document, null, 2) + "\n");

const pathCount = Object.keys(document.paths ?? {}).length;
console.log(`✓ openapi.json written to ${outPath} (${pathCount} path(s))`);
