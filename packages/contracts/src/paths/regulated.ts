// contracts-regulated: author request+response zod + registerTool() for:
//   POST /v1/compliance/sanctions (complianceSanctions)
//   POST /v1/health/rx-check      (healthRxCheck)
//   POST /v1/agent/tool-args      (agentToolArgs)
//   POST /v1/infra/plan/risk      (infraPlanRisk)
//   POST /v1/legal/cite           (legalCite)
//   POST /v1/legal/deadline       (legalDeadline)
// Request zod: port from packages/api/src/routes.ts (inline). Response zod: port
// from packages/sdk/src/types.ts. Pattern reference: ../paths/data.ts (scanSql).
export {};
