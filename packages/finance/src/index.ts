// Shared types
export type { Verdict, AssetType, Chain, FinanceCheckResult } from "./types.js";

// Providers
export { getCoinPrice, searchCoin } from "./providers/coingecko.js";
export {
  getTokenPairs,
  searchDex,
  getBestPair,
  type DexPair,
} from "./providers/dexscreener.js";
export { getStockQuote, searchStock } from "./providers/yahoo.js";
export { getRugCheckSummary, type RugCheckSummary } from "./providers/rugcheck.js";

// Checks
export {
  checkDecimals,
  type DecimalCheckInput,
  type DecimalCheckResult,
} from "./checks/decimals.js";
export {
  checkPrice,
  type PriceCheckInput,
  type PriceCheckResult,
} from "./checks/price.js";
export {
  checkRug,
  type RugCheckInput,
  type RugCheckResultExtended,
} from "./checks/rug.js";
export {
  checkLiquidity,
  type LiquidityCheckInput,
  type LiquidityCheckResult,
} from "./checks/liquidity.js";
export {
  checkPosition,
  type TradeProposal,
  type PortfolioSnapshot,
  type GuardianRules,
  type PositionCheckResult,
} from "./checks/position.js";
