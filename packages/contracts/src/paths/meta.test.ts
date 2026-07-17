import { describe, it, expect } from "vitest";
import "../index.js";
import { ServiceMetaResponse, PricingResponse } from "./meta.js";

describe("getServiceMeta", () => {
  it("ServiceMetaResponse validates the root GET / payload", () => {
    const parsed = ServiceMetaResponse.parse({
      name: "agent-toolbox.ai API",
      version: "0.1.0",
      description:
        "AI agent quality utility — hallucination firewall, import validator, context distiller",
      endpoints: {
        validate: "POST /v1/validate/imports",
        verify: "POST /v1/verify",
        distill: "POST /v1/distill",
        scanSecrets: "POST /v1/scan/secrets",
        scanInjection: "POST /v1/scan/injection",
        scanPii: "POST /v1/scan/pii",
        tokensCount: "POST /v1/tokens/count",
        scanVulnerabilities: "POST /v1/scan/vulnerabilities",
        validateIdentifier: "POST /v1/validate/identifier",
        validateSchema: "POST /v1/validate/schema",
        scanSql: "POST /v1/scan/sql",
        scanCommand: "POST /v1/scan/command",
        scanUrl: "POST /v1/scan/url",
      },
      docs: "https://agent-toolbox.ai/docs",
    });
    expect(parsed.name).toBe("agent-toolbox.ai API");
    expect(parsed.version).toBe("0.1.0");
    expect(parsed.endpoints["validateIdentifier"]).toBe("POST /v1/validate/identifier");
  });
});

describe("getPricing", () => {
  it("PricingResponse validates the /v1/pricing payload", () => {
    const parsed = PricingResponse.parse({
      wallet: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgHsV",
      network: "mainnet-beta",
      endpoints: {
        "/v1/validate/identifier": { credits: 1, lamports: 100_000, sol: 0.0001, usdApprox: "~$0.015" },
        "/v1/validate/schema":     { credits: 1, lamports: 100_000, sol: 0.0001, usdApprox: "~$0.015" },
        "/v1/scan/sql":            { credits: 1, lamports: 100_000, sol: 0.0001, usdApprox: "~$0.015" },
        "/v1/verify":              { credits: 2, lamports: 200_000, sol: 0.0002, usdApprox: "~$0.030" },
      },
      conversion: { solPerCredit: 0.0001, creditsPerSol: 10_000 },
      freeTier: { calls: 10, auth: false },
      howToPay: [
        "1. Send SOL to: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgHsV",
        "2. Pass the transaction signature as your Bearer token on the first call",
        "3. Credits are verified on-chain and added to your account",
        "4. Subsequent calls deduct credits automatically",
      ],
      docs: "https://agent-toolbox.ai/docs#authentication",
    });
    expect(parsed.network).toBe("mainnet-beta");
    expect(parsed.endpoints["/v1/validate/identifier"]!.credits).toBe(1);
    expect(parsed.freeTier.calls).toBe(10);
    expect(parsed.conversion.creditsPerSol).toBe(10_000);
  });
});
