// contracts-finance: author request+response zod + registerTool() for:
//   POST /v1/finance/units          (financeUnits)
//   POST /v1/finance/price          (financePrice)
//   POST /v1/finance/symbol         (financeSymbol)
//   POST /v1/finance/token/risk     (financeTokenRisk)
//   POST /v1/finance/slippage       (financeSlippage)
//   POST /v1/finance/order/risk     (financeOrderRisk)
//   POST /v1/finance/position/check (financePositionCheck)
// Request zod: port from packages/api/src/finance-routes.ts. Response zod: port
// from the @agentoolbox/finance result types. Pattern: ../paths/data.ts (scanSql).
export {};
