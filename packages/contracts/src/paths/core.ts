// contracts-core: author request+response zod + registerTool() for the core suite:
//   POST /v1/validate/imports  (validateImports)
//   POST /v1/verify            (verify)
//   POST /v1/distill           (distill)
// Port request zod verbatim from packages/api/src/schemas.ts.
// Port response zod from packages/sdk/src/types.ts (ValidateImportsResult,
// FirewallResult, DistillResult). Pattern reference: ../paths/data.ts (scanSql).
export {};
