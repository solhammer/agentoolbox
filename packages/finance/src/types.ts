export type Verdict = "PASS" | "FLAG" | "BLOCK";
export type AssetType = "crypto" | "stock" | "forex";
export type Chain = "solana" | "ethereum" | "bsc" | "polygon" | "base" | "arbitrum";

export interface FinanceCheckResult {
  verdict: Verdict;
  score: number; // 0-100, higher = riskier
  risks: Array<{ type: string; severity: "info" | "warn" | "critical"; detail: string }>;
  latencyMs: number;
}
