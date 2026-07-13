export interface RequestLogEntry {
  id: string;                     // crypto.randomUUID()
  timestamp: number;              // Date.now()
  path: string;                   // "/v1/validate/imports"
  method: string;                 // "POST"
  apiKey: string | null;          // null for anonymous
  ip: string;
  statusCode: number;
  latencyMs: number;
  creditCost: number;
  // Service-specific
  verdict?: "PASS" | "FLAG" | "BLOCK";
  language?: string;
  hallucinationRate?: number;
  checkTypes?: string[];
  hallucinatedPackages?: string[];
}

export interface OverviewStats {
  period: "24h";
  totalCalls: number;
  activeKeys: number;
  errorRate: number;
  verdictDistribution: { PASS: number; FLAG: number; BLOCK: number };
  callsByEndpoint: Record<string, number>;
  callsOverTime: Array<{ hour: string; count: number }>;
  topHallucinatedPackages: Array<{ name: string; language: string; count: number }>;
}

export interface HealthStatus {
  service: string;
  status: "ok" | "degraded" | "down";
  latencyMs: number | null;
  lastChecked: string;
  detail?: string;
}
