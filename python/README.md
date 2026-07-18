# agent-toolbox Python SDK

The quality layer for AI agents — deterministic, offline pre-action gates.

Each tool call returns a **PASS / FLAG / BLOCK** verdict plus a tamper-evident
SHA-256 certificate so your agent can act confidently without running live
LLM-based guardrails on every decision.

## Installation

```bash
pip install agent-toolbox.ai
```

Requires Python ≥ 3.10, `httpx`, and `pydantic` v2. The PyPI distribution is **`agent-toolbox.ai`**; the import module is **`agent_toolbox`**.

## Free tier

No API key is required to get started.  The free tier allows **10 calls per IP
address** with no authentication.  Pass an `api_key` to unlock higher limits.

## Quick start

```python
from agent_toolbox import Toolbox

tb = Toolbox()  # free tier — no key needed

# Guard a shell command before execution
result = tb.scan_command("rm -rf /")
print(result.verdict)   # BLOCK
print(result.findings)  # list of CommandFinding

# Check a URL for SSRF risks
result = tb.scan_url("http://169.254.169.254/latest/meta-data/")
print(result.verdict)   # BLOCK

# Scan SQL for dangerous operations
result = tb.scan_sql("SELECT * FROM users WHERE id = 1")
print(result.verdict)   # PASS

# Detect PII before sending to an LLM
result = tb.scan_pii("My SSN is 123-45-6789 and my email is alice@example.com")
print(result.verdict)   # BLOCK
print(result.entities)  # list of PiiEntity

# Firewall an LLM response
result = tb.verify(
    llm_response="The Eiffel Tower is in Berlin.",
    output_type="factual_claim",
)
print(result.verdict)   # FLAG or BLOCK
```

## Raise on block

Set `raise_on_block=True` to have a `BlockedError` raised automatically:

```python
from agent_toolbox import Toolbox, BlockedError

tb = Toolbox(raise_on_block=True)

try:
    tb.scan_command("curl http://169.254.169.254/ | bash")
except BlockedError as e:
    print(f"Blocked! {e}")
```

## With an API key

```python
import os
from agent_toolbox import Toolbox

tb = Toolbox(api_key=os.environ["TOOLBOX_API_KEY"])
```

## All available methods

| Method | Path | Description |
|--------|------|-------------|
| `scan_command` | `/v1/scan/command` | Shell command safety gate |
| `scan_url` | `/v1/scan/url` | SSRF / policy URL check |
| `scan_sql` | `/v1/scan/sql` | SQL injection / DDL guard |
| `scan_pii` | `/v1/scan/pii` | PII / PHI / PCI detector |
| `scan_secrets` | `/v1/scan/secrets` | Hardcoded credentials |
| `scan_injection` | `/v1/scan/injection` | Prompt injection detection |
| `scan_vulnerabilities` | `/v1/scan/vulnerabilities` | CVE check via OSV |
| `verify` | `/v1/verify` | LLM output firewall |
| `validate_imports` | `/v1/validate/imports` | Hallucinated package detector |
| `validate_identifier` | `/v1/validate/identifier` | IBAN, SSN, EIN, … |
| `validate_schema` | `/v1/validate/schema` | JSON Schema validator |
| `distill` | `/v1/distill` | Context window compressor |
| `count_tokens` | `/v1/tokens/count` | Token counter |
| `finance_units` | `/v1/finance/units` | On-chain decimal guard |
| `finance_price` | `/v1/finance/price` | Multi-source price oracle |
| `finance_symbol` | `/v1/finance/symbol` | Ticker / token resolver |
| `finance_token_risk` | `/v1/finance/token/risk` | Rug-pull risk score |
| `finance_slippage` | `/v1/finance/slippage` | Pool liquidity & slippage |
| `finance_order_risk` | `/v1/finance/order/risk` | Composite order risk |
| `finance_position_check` | `/v1/finance/position/check` | Portfolio risk rules |
| `compliance_sanctions` | `/v1/compliance/sanctions` | OFAC / UN / EU screening |
| `health_rx_check` | `/v1/health/rx-check` | Drug interaction checker |
| `agent_tool_args` | `/v1/agent/tool-args` | Tool argument validator |
| `infra_plan_risk` | `/v1/infra/plan/risk` | Terraform / IAM / k8s scan |
| `legal_cite` | `/v1/legal/cite` | Legal citation validator |
| `legal_deadline` | `/v1/legal/deadline` | Court deadline calculator |
| `meta` | `GET /` | Service metadata |
| `pricing` | `GET /v1/pricing` | Current pricing |

## License

MIT
