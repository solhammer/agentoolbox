// contracts-data (meta): register the two GET discovery endpoints:
//   GET /            -> service metadata { name, version, description, endpoints, docs }
//   GET /v1/pricing  -> { wallet, network, endpoints: {..per-endpoint credits..}, ... }
// These are GET (no request body) — use registry.registerPath directly rather
// than registerTool (which is POST-only). Response zod from packages/api/src/index.ts
// (root) and packages/api/src/routes.ts (pricing).
export {};
