// contracts-security: author request+response zod + registerTool() for:
//   POST /v1/scan/secrets          (scanSecrets)
//   POST /v1/scan/injection        (scanInjection)
//   POST /v1/tokens/count          (countTokens)
//   POST /v1/scan/vulnerabilities  (scanVulnerabilities)
//   POST /v1/scan/pii              (scanPii)
//   POST /v1/scan/command          (scanCommand)
//   POST /v1/scan/url              (scanUrl)
// Request zod: port from packages/api/src/routes.ts (inline). Response zod: port
// from packages/sdk/src/types.ts. Pattern reference: ../paths/data.ts (scanSql).
export {};
