"""Pydantic models for the agent-toolbox.ai API.

Hand-written from openapi.json (28 paths: 26 tool endpoints + GET / + GET /v1/pricing).
All models use pydantic v2 style (model_config, field validators).
"""

from __future__ import annotations

from typing import Any, Literal, Optional, Union

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Shared enums / type aliases
# ---------------------------------------------------------------------------

Verdict = Literal["PASS", "FLAG", "BLOCK"]
Language = Literal["python", "javascript", "typescript", "rust", "go"]
Severity = Literal["low", "medium", "high", "critical"]
EnforcementMode = Literal["block", "flag", "audit"]
Chain = Literal["solana", "ethereum", "bsc", "polygon", "base", "arbitrum"]
AssetType = Literal["crypto", "stock", "forex"]
ImportStatus = Literal["valid", "hallucinated", "unknown"]
TokenModel = Literal["gpt-4", "gpt-3.5", "claude", "gemini", "generic"]


# ---------------------------------------------------------------------------
# Error response
# ---------------------------------------------------------------------------


class ErrorResponse(BaseModel):
    error: str
    message: str
    docs: Optional[str] = None


# ---------------------------------------------------------------------------
# /v1/validate/imports
# ---------------------------------------------------------------------------


class ValidateImportsRequest(BaseModel):
    language: Language
    code: str = Field(min_length=1, max_length=100_000)
    timeout_ms: Optional[int] = Field(None, alias="timeoutMs", ge=500, le=30_000)

    model_config = {"populate_by_name": True}


class ImportItem(BaseModel):
    name: str
    raw: str
    status: ImportStatus
    registry: Optional[str] = None
    registry_url: Optional[str] = Field(None, alias="registryUrl")
    error: Optional[str] = None

    model_config = {"populate_by_name": True}


class ValidateImportsResponse(BaseModel):
    language: Language
    valid: list[ImportItem]
    hallucinated: list[ImportItem]
    unknown: list[ImportItem]
    total_imports: int = Field(alias="totalImports")
    hallucination_rate: float = Field(alias="hallucinationRate")
    latency_ms: float = Field(alias="latencyMs")

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# /v1/verify
# ---------------------------------------------------------------------------

OutputType = Literal["code", "natural_language", "agent_action", "factual_claim"]


class VerifyRequest(BaseModel):
    output_type: OutputType = Field(alias="outputType")
    llm_response: str = Field(alias="llmResponse", min_length=1, max_length=200_000)
    language: Optional[Language] = None
    enforcement_mode: EnforcementMode = Field("block", alias="enforcementMode")
    timeout_ms: Optional[int] = Field(None, alias="timeoutMs", ge=500, le=30_000)

    model_config = {"populate_by_name": True}


class Claim(BaseModel):
    text: str
    verdict: Verdict
    confidence: float
    check_type: str = Field(alias="checkType")
    evidence: Optional[str] = None
    suggested_fix: Optional[str] = Field(None, alias="suggestedFix")

    model_config = {"populate_by_name": True}


class ImportValidation(BaseModel):
    valid: list[str]
    hallucinated: list[str]
    unknown: list[str]
    hallucination_rate: float = Field(alias="hallucinationRate")

    model_config = {"populate_by_name": True}


class VerifyResponse(BaseModel):
    verdict: Verdict
    overall_score: float = Field(alias="overallScore")
    claims: list[Claim]
    output_type: OutputType = Field(alias="outputType")
    enforcement_mode: EnforcementMode = Field(alias="enforcementMode")
    latency_ms: float = Field(alias="latencyMs")
    certificate: str
    import_validation: Optional[ImportValidation] = Field(None, alias="importValidation")

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# /v1/distill
# ---------------------------------------------------------------------------

MessageRole = Literal["system", "user", "assistant", "tool"]


class Message(BaseModel):
    role: MessageRole
    content: str


class DistillRequest(BaseModel):
    messages: list[Message] = Field(min_length=1, max_length=500)
    target_tokens: int = Field(4000, alias="targetTokens", ge=100, le=200_000)
    preserve_system_prompt: bool = Field(True, alias="preserveSystemPrompt")

    model_config = {"populate_by_name": True}


class DistillResponse(BaseModel):
    messages: list[Message]
    original_count: int = Field(alias="originalCount")
    distilled_count: int = Field(alias="distilledCount")
    estimated_tokens: int = Field(alias="estimatedTokens")
    compression_ratio: float = Field(alias="compressionRatio")
    method: str

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# /v1/scan/secrets
# ---------------------------------------------------------------------------


class ScanSecretsRequest(BaseModel):
    code: str = Field(min_length=1, max_length=200_000)
    filename: Optional[str] = None


class SecretFinding(BaseModel):
    type: str
    match: str
    line: int
    severity: Literal["critical", "high", "medium"]
    suggestion: str


class ScanSecretsResponse(BaseModel):
    findings: list[SecretFinding]
    total_findings: int = Field(alias="totalFindings")
    critical: int
    high: int
    safe: bool
    filename: Optional[str] = None

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# /v1/scan/injection
# ---------------------------------------------------------------------------


class ScanInjectionRequest(BaseModel):
    input: str = Field(min_length=1, max_length=50_000)
    context: Optional[str] = None


class ScanInjectionResponse(BaseModel):
    risk: Literal["safe", "suspicious", "injection"]
    score: float
    patterns: list[str]
    advice: str
    context: Optional[str] = None


# ---------------------------------------------------------------------------
# /v1/tokens/count
# ---------------------------------------------------------------------------


class CountMessage(BaseModel):
    role: str
    content: str


class EstimatedCostUsd(BaseModel):
    input: float
    output1k: float


class CountTokensRequest(BaseModel):
    text: Optional[str] = Field(None, max_length=500_000)
    messages: Optional[list[CountMessage]] = None
    model: TokenModel = "generic"


class CountTokensTextResponse(BaseModel):
    tokens: int
    characters: int
    words: int
    estimated_cost_usd: EstimatedCostUsd = Field(alias="estimatedCostUsd")
    model: TokenModel

    model_config = {"populate_by_name": True}


class PerMessageCount(BaseModel):
    role: str
    tokens: int


class CountTokensMessagesResponse(BaseModel):
    total: int
    per_message: list[PerMessageCount] = Field(alias="perMessage")
    estimated_cost_usd: EstimatedCostUsd = Field(alias="estimatedCostUsd")
    model: TokenModel
    context_window_remaining: int = Field(alias="contextWindowRemaining")

    model_config = {"populate_by_name": True}


# CountTokensResponse is a union — we return a dict at runtime and let callers parse
CountTokensResponse = Union[CountTokensTextResponse, CountTokensMessagesResponse]


# ---------------------------------------------------------------------------
# /v1/scan/vulnerabilities
# ---------------------------------------------------------------------------


class Vulnerability(BaseModel):
    id: str
    summary: str
    severity: str
    aliases: list[str]


class VulnFinding(BaseModel):
    package: str
    vulnerabilities: list[Vulnerability]


class ScanVulnerabilitiesRequest(BaseModel):
    packages: list[str] = Field(min_length=1, max_length=50)
    language: Language
    timeout_ms: Optional[float] = Field(None, alias="timeoutMs")

    model_config = {"populate_by_name": True}


class ScanVulnerabilitiesResponse(BaseModel):
    findings: list[VulnFinding]
    total_packages: int = Field(alias="totalPackages")
    vulnerable_packages: int = Field(alias="vulnerablePackages")
    safe: bool
    latency_ms: float = Field(alias="latencyMs")

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# /v1/scan/pii
# ---------------------------------------------------------------------------

PiiCategory = Literal["PII", "PHI", "PCI"]
PiiSeverity = Literal["low", "medium", "high", "critical"]


class PiiPolicy(BaseModel):
    mode: Optional[EnforcementMode] = None
    block_severity_at_or_above: Optional[PiiSeverity] = Field(None, alias="blockSeverityAtOrAbove")
    allow_types: Optional[list[str]] = Field(None, alias="allowTypes")
    jurisdictions: Optional[list[str]] = None
    redact: Optional[bool] = None

    model_config = {"populate_by_name": True}


class ScanPiiRequest(BaseModel):
    text: str = Field(min_length=1, max_length=200_000)
    filename: Optional[str] = None
    policy: Optional[PiiPolicy] = None


class PiiSeverityCounts(BaseModel):
    low: Optional[int] = None
    medium: Optional[int] = None
    high: Optional[int] = None
    critical: Optional[int] = None


class PiiEntity(BaseModel):
    type: str
    category: PiiCategory
    severity: PiiSeverity
    match: str
    start: int
    end: int
    line: int
    validated: bool
    confidence: float
    jurisdiction: Optional[str] = None


class ScanPiiResponse(BaseModel):
    verdict: Verdict
    safe: bool
    score: float
    categories: list[PiiCategory]
    total_findings: int = Field(alias="totalFindings")
    counts: PiiSeverityCounts
    entities: list[PiiEntity]
    certificate: str
    enforcement_mode: EnforcementMode = Field(alias="enforcementMode")
    latency_ms: float = Field(alias="latencyMs")
    redacted_text: Optional[str] = Field(None, alias="redactedText")
    filename: Optional[str] = None

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# /v1/scan/command
# ---------------------------------------------------------------------------

Shell = Literal["bash", "sh", "zsh", "powershell", "generic"]
ScanSeverity = Literal["low", "medium", "high", "critical"]


class CommandPolicy(BaseModel):
    block_severity_at_or_above: Optional[ScanSeverity] = Field(None, alias="blockSeverityAtOrAbove")
    allow: Optional[list[str]] = Field(None, max_length=100)
    protected_refs: Optional[list[str]] = Field(None, alias="protectedRefs", max_length=100)
    max_segments: Optional[int] = Field(None, alias="maxSegments", ge=1, le=1000)

    model_config = {"populate_by_name": True}


class ScanCommandRequest(BaseModel):
    command: str = Field(min_length=1, max_length=200_000)
    shell: Optional[Shell] = None
    policy: Optional[CommandPolicy] = None


class CommandFinding(BaseModel):
    rule_id: str = Field(alias="ruleId")
    severity: ScanSeverity
    segment_index: int = Field(alias="segmentIndex")
    message: str
    snippet: str

    model_config = {"populate_by_name": True}


class SeverityCounts(BaseModel):
    low: int
    medium: int
    high: int
    critical: int


class ScanCommandResponse(BaseModel):
    verdict: Verdict
    segments: int
    findings: list[CommandFinding]
    counts: SeverityCounts
    certificate: str
    latency_ms: float = Field(alias="latencyMs")

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# /v1/scan/url
# ---------------------------------------------------------------------------

HostType = Literal["ipv4", "ipv6", "hostname"]
IpClass = Literal["public", "loopback", "private", "link-local", "reserved", "unknown"]


class UrlPolicy(BaseModel):
    allow_schemes: Optional[list[str]] = Field(None, alias="allowSchemes", max_length=20)
    allow_hosts: Optional[list[str]] = Field(None, alias="allowHosts", max_length=200)
    deny_hosts: Optional[list[str]] = Field(None, alias="denyHosts", max_length=200)
    deny_private: Optional[bool] = Field(None, alias="denyPrivate")
    allowed_ports: Optional[list[int]] = Field(None, alias="allowedPorts", max_length=50)
    resolve: Optional[bool] = None
    block_severity_at_or_above: Optional[ScanSeverity] = Field(None, alias="blockSeverityAtOrAbove")

    model_config = {"populate_by_name": True}


class ScanUrlRequest(BaseModel):
    url: str = Field(min_length=1, max_length=8192)
    policy: Optional[UrlPolicy] = None


class UrlTarget(BaseModel):
    scheme: str
    host: str
    host_type: HostType = Field(alias="hostType")
    ip_class: IpClass = Field(alias="ipClass")
    port: Optional[int] = None
    normalized_url: str = Field(alias="normalizedUrl")

    model_config = {"populate_by_name": True}


class UrlFinding(BaseModel):
    rule_id: str = Field(alias="ruleId")
    severity: ScanSeverity
    message: str

    model_config = {"populate_by_name": True}


class ScanUrlResponse(BaseModel):
    verdict: Verdict
    target: UrlTarget
    findings: list[UrlFinding]
    counts: SeverityCounts
    certificate: str
    latency_ms: float = Field(alias="latencyMs")

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# /v1/finance/units
# ---------------------------------------------------------------------------


class FinanceUnitsRequest(BaseModel):
    token_address: str = Field(alias="tokenAddress")
    raw_amount: str = Field(alias="rawAmount")
    ui_amount: float = Field(alias="uiAmount", gt=0)
    chain: Chain

    model_config = {"populate_by_name": True}


class RiskItem(BaseModel):
    type: str
    severity: Literal["info", "warn", "critical"]
    detail: str


class FinanceUnitsResponse(BaseModel):
    verdict: Verdict
    score: float
    risks: list[RiskItem]
    latency_ms: float = Field(alias="latencyMs")
    authoritative_decimals: Optional[int] = None
    expected_raw: Optional[str] = None
    actual_raw: str
    deviation_pct: Optional[float] = None

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# /v1/finance/price
# ---------------------------------------------------------------------------


class FinancePriceRequest(BaseModel):
    asset_type: AssetType = Field(alias="assetType")
    symbol: Optional[str] = None
    token_address: Optional[str] = Field(None, alias="tokenAddress")
    proposed_price: Optional[float] = Field(None, alias="proposedPrice", gt=0)
    max_age_seconds: Optional[int] = Field(None, alias="maxAgeSeconds", gt=0)
    divergence_threshold_pct: Optional[float] = Field(None, alias="divergenceThresholdPct", gt=0)

    model_config = {"populate_by_name": True}


class PriceSource(BaseModel):
    name: str
    price_usd: float = Field(alias="priceUsd")
    age_seconds: Optional[float] = Field(None, alias="ageSeconds")
    available: bool

    model_config = {"populate_by_name": True}


class FinancePriceResponse(BaseModel):
    verdict: Verdict
    score: float
    risks: list[RiskItem]
    latency_ms: float = Field(alias="latencyMs")
    sources: list[PriceSource]
    consensus_price: Optional[float] = Field(None, alias="consensusPrice")
    proposed_price_deviation: Optional[float] = Field(None, alias="proposedPriceDeviation")

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# /v1/finance/symbol
# ---------------------------------------------------------------------------

FinanceAssetType = Literal["crypto", "stock"]


class FinanceSymbolRequest(BaseModel):
    symbol: str
    asset_type: FinanceAssetType = Field(alias="assetType")
    expected_name: Optional[str] = Field(None, alias="expectedName")
    chain: Optional[str] = None

    model_config = {"populate_by_name": True}


class SymbolMatch(BaseModel):
    symbol: str
    name: str
    exchange: Optional[str] = None
    liquidity: Optional[float] = None


class FinanceSymbolResponse(BaseModel):
    found: bool
    matches: list[SymbolMatch]
    ambiguous: bool
    verdict: Verdict


# ---------------------------------------------------------------------------
# /v1/finance/token/risk
# ---------------------------------------------------------------------------


class FinanceTokenRiskRequest(BaseModel):
    address: str
    chain: Chain
    max_rug_score: Optional[float] = Field(None, alias="maxRugScore")
    require_lp_locked: Optional[bool] = Field(None, alias="requireLpLocked")
    block_if_mint_authority: Optional[bool] = Field(None, alias="blockIfMintAuthority")
    block_if_freeze_authority: Optional[bool] = Field(None, alias="blockIfFreezeAuthority")

    model_config = {"populate_by_name": True}


class FinanceTokenRiskResponse(BaseModel):
    verdict: Verdict
    score: float
    risks: list[RiskItem]
    latency_ms: float = Field(alias="latencyMs")
    rug_score: Optional[float] = Field(None, alias="rugScore")
    mint_authority_active: Optional[bool] = Field(None, alias="mintAuthorityActive")
    freeze_authority_active: Optional[bool] = Field(None, alias="freezeAuthorityActive")
    lp_locked_pct: Optional[float] = Field(None, alias="lpLockedPct")
    specific_risks: list[str] = Field(alias="specificRisks")

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# /v1/finance/slippage
# ---------------------------------------------------------------------------


class FinanceSlippageRequest(BaseModel):
    token_address: str = Field(alias="tokenAddress")
    chain: str
    trade_usd: float = Field(alias="tradeUsd", gt=0)
    max_price_impact_pct: Optional[float] = Field(None, alias="maxPriceImpactPct", gt=0)
    min_liquidity_usd: Optional[float] = Field(None, alias="minLiquidityUsd", gt=0)

    model_config = {"populate_by_name": True}


class FinanceSlippageResponse(BaseModel):
    verdict: Verdict
    score: float
    risks: list[RiskItem]
    latency_ms: float = Field(alias="latencyMs")
    pool_liquidity_usd: Optional[float] = Field(None, alias="poolLiquidityUsd")
    estimated_price_impact_pct: Optional[float] = Field(None, alias="estimatedPriceImpactPct")
    volume_24h: Optional[float] = Field(None, alias="volume24h")
    wash_trading_flag: bool = Field(alias="washTradingFlag")

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# /v1/finance/order/risk
# ---------------------------------------------------------------------------

TradeSide = Literal["buy", "sell"]


class FinanceOrderRiskRequest(BaseModel):
    asset_type: FinanceAssetType = Field(alias="assetType")
    side: TradeSide
    trade_usd: float = Field(alias="tradeUsd", gt=0)
    symbol: Optional[str] = None
    token_address: Optional[str] = Field(None, alias="tokenAddress")
    portfolio_value_usd: Optional[float] = Field(None, alias="portfolioValueUsd", gt=0)
    chain: Optional[str] = None
    leverage: Optional[float] = Field(None, gt=0)

    model_config = {"populate_by_name": True}


class OrderCheck(BaseModel):
    verdict: Verdict
    score: float
    risks: list[RiskItem]
    latency_ms: float = Field(alias="latencyMs")
    name: str

    model_config = {"populate_by_name": True}


class FinanceOrderRiskResponse(BaseModel):
    verdict: Verdict
    overall_score: float = Field(alias="overallScore")
    checks: list[OrderCheck]
    blocked_by: Optional[str] = Field(None, alias="blockedBy")
    latency_ms: float = Field(alias="latencyMs")

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# /v1/finance/position/check
# ---------------------------------------------------------------------------

PositionSide = Literal["buy", "sell", "long", "short"]
PositionAssetType = Literal["crypto", "stock", "forex"]


class PositionTrade(BaseModel):
    symbol: str
    side: PositionSide
    trade_usd: float = Field(alias="tradeUsd", gt=0)
    asset_type: PositionAssetType = Field(alias="assetType")
    leverage: Optional[float] = Field(None, gt=0)

    model_config = {"populate_by_name": True}


class PortfolioState(BaseModel):
    total_value_usd: float = Field(alias="totalValueUsd", gt=0)
    cash_usd: float = Field(alias="cashUsd", ge=0)
    daily_pnl_usd: Optional[float] = Field(None, alias="dailyPnlUsd")
    open_positions: Optional[int] = Field(None, alias="openPositions", ge=0)
    asset_allocation: Optional[dict[str, float]] = Field(None, alias="assetAllocation")

    model_config = {"populate_by_name": True}


class PositionRules(BaseModel):
    max_position_pct: Optional[float] = Field(None, alias="maxPositionPct", gt=0, le=100)
    max_daily_loss_pct: Optional[float] = Field(None, alias="maxDailyLossPct", gt=0)
    max_open_positions: Optional[int] = Field(None, alias="maxOpenPositions", gt=0)
    max_leverage: Optional[float] = Field(None, alias="maxLeverage", gt=0)
    allowed_assets: Optional[list[str]] = Field(None, alias="allowedAssets")
    kill_switch: Optional[bool] = Field(None, alias="killSwitch")
    max_single_trade_usd: Optional[float] = Field(None, alias="maxSingleTradeUsd", gt=0)

    model_config = {"populate_by_name": True}


class FinancePositionCheckRequest(BaseModel):
    trade: PositionTrade
    portfolio: PortfolioState
    rules: Optional[PositionRules] = None


class FinancePositionCheckResponse(BaseModel):
    verdict: Verdict
    score: float
    risks: list[RiskItem]
    latency_ms: float = Field(alias="latencyMs")
    effective_usd: float = Field(alias="effectiveUsd")
    position_pct: Optional[float] = Field(None, alias="positionPct")
    violations: list[str]

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# /v1/compliance/sanctions
# ---------------------------------------------------------------------------

EntityType = Literal["individual", "entity", "vessel", "aircraft", "unknown"]


class ComplianceSanctionsRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=512)
    names: Optional[list[str]] = Field(None, max_length=100)
    min_score: Optional[float] = Field(None, ge=0, le=1)
    lists: Optional[list[str]] = Field(None, max_length=50)
    entity_types: Optional[list[EntityType]] = Field(None, alias="entityTypes")
    fuzzy: Optional[bool] = None

    model_config = {"populate_by_name": True}


class SanctionsMatch(BaseModel):
    query: str
    listed_name: str = Field(alias="listedName")
    matched_alias: Optional[str] = Field(None, alias="matchedAlias")
    score: float
    match_type: Literal["exact", "alias", "fuzzy"] = Field(alias="matchType")
    list: str
    program: Optional[str] = None
    entity_type: EntityType = Field(alias="entityType")
    id: Optional[str] = None
    jurisdiction: Optional[str] = None

    model_config = {"populate_by_name": True}


class SanctionsCounts(BaseModel):
    total: int
    block: int
    flag: int


class ComplianceSanctionsResponse(BaseModel):
    verdict: Verdict
    matches: list[SanctionsMatch]
    counts: SanctionsCounts
    screened: int
    dataset_date: str = Field(alias="datasetDate")
    certificate: str
    latency_ms: float = Field(alias="latencyMs")

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# /v1/health/rx/check
# ---------------------------------------------------------------------------

RxSeverity = Literal["low", "moderate", "major", "contraindicated"]
BlockRxSeverity = Literal["moderate", "major", "contraindicated"]


class Medication(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    dose: Optional[float] = Field(None, ge=0)
    unit: Optional[str] = Field(None, max_length=20)
    route: Optional[str] = Field(None, max_length=40)
    frequency_per_day: Optional[float] = Field(None, alias="frequencyPerDay", gt=0, le=100)

    model_config = {"populate_by_name": True}


class Patient(BaseModel):
    weight_kg: Optional[float] = Field(None, alias="weightKg", gt=0, le=1000)
    age_years: Optional[float] = Field(None, alias="ageYears", ge=0, le=150)

    model_config = {"populate_by_name": True}


class RxPolicy(BaseModel):
    block_severity_at_or_above: Optional[BlockRxSeverity] = Field(None, alias="blockSeverityAtOrAbove")

    model_config = {"populate_by_name": True}


class HealthRxCheckRequest(BaseModel):
    medications: list[Medication] = Field(min_length=1, max_length=50)
    patient: Optional[Patient] = None
    policy: Optional[RxPolicy] = None


class RxFinding(BaseModel):
    type: Literal["unit", "dose", "interaction"]
    severity: RxSeverity
    drugs: list[str]
    message: str
    reference: Optional[str] = None


class RxCounts(BaseModel):
    low: int
    moderate: int
    major: int
    contraindicated: int


class HealthRxCheckResponse(BaseModel):
    verdict: Verdict
    findings: list[RxFinding]
    counts: RxCounts
    certificate: str
    latency_ms: float = Field(alias="latencyMs")
    disclaimer: str

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# /v1/agent/tool/args
# ---------------------------------------------------------------------------

FieldType = Literal["string", "number", "integer", "boolean", "array", "object"]
FieldUnit = Literal["usd", "cents", "percent", "bps"]
RuleOp = Literal["lte", "gte", "lt", "gt", "eq", "neq"]


class FieldSpec(BaseModel):
    type: FieldType
    required: Optional[bool] = None
    nullable: Optional[bool] = None
    enum: Optional[list[Union[str, float]]] = None
    min: Optional[float] = None
    max: Optional[float] = None
    min_length: Optional[float] = Field(None, alias="minLength")
    max_length: Optional[float] = Field(None, alias="maxLength")
    pattern: Optional[str] = None
    unit: Optional[FieldUnit] = None

    model_config = {"populate_by_name": True}


class RuleRightConst(BaseModel):
    const: Union[float, str]


class ArgsRule(BaseModel):
    op: RuleOp
    left: str
    right: Union[str, RuleRightConst]
    message: Optional[str] = None


class ArgsSchema(BaseModel):
    fields: dict[str, FieldSpec]
    allow_unknown: Optional[bool] = Field(None, alias="allowUnknown")
    rules: Optional[list[ArgsRule]] = None

    model_config = {"populate_by_name": True}


class ArgsPolicy(BaseModel):
    mode: Optional[EnforcementMode] = None
    block_severity_at_or_above: Optional[ScanSeverity] = Field(None, alias="blockSeverityAtOrAbove")

    model_config = {"populate_by_name": True}


class AgentToolArgsRequest(BaseModel):
    args: dict[str, Any]
    schema: ArgsSchema
    tool: Optional[str] = Field(None, max_length=200)
    policy: Optional[ArgsPolicy] = None


class ArgsViolation(BaseModel):
    path: str
    rule: str
    severity: ScanSeverity
    message: str
    expected: Optional[Any] = None
    actual: Optional[Any] = None


class AgentToolArgsResponse(BaseModel):
    verdict: Verdict
    violations: list[ArgsViolation]
    counts: SeverityCounts
    certificate: str
    latency_ms: float = Field(alias="latencyMs")

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# /v1/infra/plan/risk
# ---------------------------------------------------------------------------

InfraFormat = Literal["terraform", "iam", "k8s"]


class InfraPolicy(BaseModel):
    block_severity_at_or_above: Optional[ScanSeverity] = Field(None, alias="blockSeverityAtOrAbove")

    model_config = {"populate_by_name": True}


class InfraPlanRiskRequest(BaseModel):
    format: InfraFormat
    document: Optional[Any] = None
    policy: Optional[InfraPolicy] = None


class InfraFinding(BaseModel):
    rule_id: str = Field(alias="ruleId")
    severity: ScanSeverity
    resource: str
    message: str
    framework: Optional[str] = None

    model_config = {"populate_by_name": True}


class InfraPlanRiskResponse(BaseModel):
    verdict: Verdict
    findings: list[InfraFinding]
    counts: SeverityCounts
    certificate: str
    latency_ms: float = Field(alias="latencyMs")

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# /v1/legal/cite
# ---------------------------------------------------------------------------


class LegalCiteRequest(BaseModel):
    citation: Optional[str] = Field(None, max_length=500)
    citations: Optional[list[str]] = Field(None, max_length=200)
    source_text: Optional[str] = Field(None, alias="sourceText", max_length=200_000)
    quote: Optional[str] = Field(None, max_length=10_000)

    model_config = {"populate_by_name": True}


class ParsedCitation(BaseModel):
    volume: int
    reporter: str
    page: int
    year: int


class CitationResult(BaseModel):
    raw: str
    parsed: Optional[ParsedCitation] = None
    valid: bool
    issues: list[str]


class QuoteCheck(BaseModel):
    found: bool
    message: str


class CiteCounts(BaseModel):
    total: int
    invalid: int


class LegalCiteResponse(BaseModel):
    verdict: Verdict
    citations: list[CitationResult]
    quote_check: Optional[QuoteCheck] = Field(None, alias="quoteCheck")
    counts: CiteCounts
    certificate: str
    latency_ms: float = Field(alias="latencyMs")

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# /v1/legal/deadline
# ---------------------------------------------------------------------------

DeadlineMode = Literal["court", "calendar"]
DeadlineDirection = Literal["after", "before"]


class LegalDeadlineRequest(BaseModel):
    start: str = Field(min_length=1, max_length=40)
    days: int = Field(ge=0, le=100_000)
    mode: Optional[DeadlineMode] = None
    direction: Optional[DeadlineDirection] = None
    jurisdiction: Optional[str] = Field(None, max_length=80)


class DeadlineSkipped(BaseModel):
    weekends: int
    holidays: list[str]


class LegalDeadlineResponse(BaseModel):
    verdict: Verdict
    deadline: str
    start_date: str = Field(alias="startDate")
    days_requested: int = Field(alias="daysRequested")
    mode: DeadlineMode
    direction: DeadlineDirection
    skipped: DeadlineSkipped
    certificate: str
    latency_ms: float = Field(alias="latencyMs")

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# /v1/scan/sql
# ---------------------------------------------------------------------------

SqlDialect = Literal["postgres", "mysql", "sqlite", "tsql", "generic"]


class SqlPolicy(BaseModel):
    allow_ddl: Optional[bool] = Field(None, alias="allowDdl")
    allow_unbounded_writes: Optional[bool] = Field(None, alias="allowUnboundedWrites")
    max_statements: Optional[int] = Field(None, alias="maxStatements", ge=1, le=1000)
    block_severity_at_or_above: Optional[ScanSeverity] = Field(None, alias="blockSeverityAtOrAbove")

    model_config = {"populate_by_name": True}


class ScanSqlRequest(BaseModel):
    sql: str = Field(min_length=1, max_length=200_000)
    dialect: Optional[SqlDialect] = None
    policy: Optional[SqlPolicy] = None


class SqlFinding(BaseModel):
    rule_id: str = Field(alias="ruleId")
    severity: ScanSeverity
    statement_index: int = Field(alias="statementIndex")
    message: str
    snippet: str

    model_config = {"populate_by_name": True}


class ScanSqlResponse(BaseModel):
    verdict: Verdict
    statements: int
    findings: list[SqlFinding]
    counts: SeverityCounts
    certificate: str
    latency_ms: float = Field(alias="latencyMs")

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# /v1/validate/identifier
# ---------------------------------------------------------------------------

IdentifierType = Literal[
    "iban", "aba_routing", "swift_bic", "credit_card", "ein",
    "vat_eu", "vin", "npi", "ssn", "eth_address", "sol_address",
]


class ValidateIdentifierRequest(BaseModel):
    value: Optional[str] = Field(None, max_length=200)
    values: Optional[list[str]] = Field(None, max_length=100)
    type: Optional[IdentifierType] = None
    types: Optional[list[IdentifierType]] = None


class IdentifierResult(BaseModel):
    value: str
    type: Union[IdentifierType, Literal["unknown"]]
    valid: bool
    checksum: Literal["pass", "fail", "not_applicable"]
    normalized: Optional[str] = None
    detail: Optional[str] = None


class IdentifierCounts(BaseModel):
    total: int
    invalid: int


class ValidateIdentifierResponse(BaseModel):
    verdict: Verdict
    results: list[IdentifierResult]
    counts: IdentifierCounts
    certificate: str
    latency_ms: float = Field(alias="latencyMs")

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# /v1/validate/schema
# ---------------------------------------------------------------------------


class SchemaPolicy(BaseModel):
    mode: Optional[EnforcementMode] = None


class ValidateSchemaRequest(BaseModel):
    schema: dict[str, Any]
    data: Optional[Any] = None
    policy: Optional[SchemaPolicy] = None


class SchemaError(BaseModel):
    path: str
    keyword: str
    message: str
    expected: Optional[Any] = None
    actual: Optional[Any] = None


class SchemaErrorCounts(BaseModel):
    errors: int


class ValidateSchemaResponse(BaseModel):
    verdict: Verdict
    valid: bool
    errors: list[SchemaError]
    counts: SchemaErrorCounts
    certificate: str
    latency_ms: float = Field(alias="latencyMs")

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# GET / — service metadata
# ---------------------------------------------------------------------------


class ServiceMetaResponse(BaseModel):
    name: str
    version: str
    description: str
    endpoints: dict[str, str]
    docs: str


# ---------------------------------------------------------------------------
# GET /v1/pricing
# ---------------------------------------------------------------------------


class EndpointPricing(BaseModel):
    credits: int
    lamports: int
    sol: float
    usd_approx: str = Field(alias="usdApprox")

    model_config = {"populate_by_name": True}


class PricingConversion(BaseModel):
    sol_per_credit: float = Field(alias="solPerCredit")
    credits_per_sol: float = Field(alias="creditsPerSol")

    model_config = {"populate_by_name": True}


class FreeTier(BaseModel):
    calls: int
    auth: bool


class PricingResponse(BaseModel):
    wallet: str
    network: str
    endpoints: dict[str, EndpointPricing]
    conversion: PricingConversion
    free_tier: FreeTier = Field(alias="freeTier")
    how_to_pay: list[str] = Field(alias="howToPay")
    docs: str

    model_config = {"populate_by_name": True}
