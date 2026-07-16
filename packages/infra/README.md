# @agentoolbox/infra

> IaC blast-radius and risk gate — deterministic, offline static analysis of Terraform plans, AWS IAM policies, and Kubernetes manifests.

## Features

- **Deterministic** — pure function, no I/O, no randomness (except timestamp in certificate).
- **Offline** — no cloud credentials, no network calls.
- **Multi-format** — `terraform` (from `terraform show -json`), `iam` (AWS policy JSON), `k8s` (Kubernetes manifest JSON).
- **Configurable thresholds** — choose which severity causes a `BLOCK` vs. a `FLAG`.
- **Signed verdicts** — tamper-evident SHA-256 certificate binding document hash + verdict.

## Usage

```ts
import { checkInfraPlan } from "@agentoolbox/infra";

const result = checkInfraPlan({
  format: "terraform",
  document: JSON.parse(await fs.readFile("plan.json", "utf8")),
  policy: { blockSeverityAtOrAbove: "high" }, // default
});

console.log(result.verdict);   // "PASS" | "FLAG" | "BLOCK"
console.log(result.findings);  // Finding[]
console.log(result.counts);    // { low: n, medium: n, high: n, critical: n }
console.log(result.certificate); // "sha256:<hex>"
```

## API

### `checkInfraPlan(input: InfraPlanInput): InfraPlanResult`

#### Input

| Field | Type | Description |
|---|---|---|
| `format` | `"terraform" \| "iam" \| "k8s"` | Document format |
| `document` | `unknown` | Already-parsed JSON |
| `policy.blockSeverityAtOrAbove` | `Severity` (optional) | Minimum severity that triggers `BLOCK` (default `"high"`) |

#### Result

| Field | Description |
|---|---|
| `verdict` | `"PASS"` / `"FLAG"` / `"BLOCK"` |
| `findings` | Array of policy violations |
| `counts` | Finding counts by severity |
| `certificate` | `sha256:<hex>` — tamper-evident signature |
| `latencyMs` | Wall-clock time in ms |

## Rules

See [SPEC.md](./SPEC.md) for the full rule catalogue.

## Building

```sh
pnpm --filter @agentoolbox/infra build
pnpm --filter @agentoolbox/infra test
pnpm --filter @agentoolbox/infra typecheck
```
