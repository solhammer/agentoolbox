"""agent-toolbox Python SDK.

Quick start (free tier — no API key required)::

    from agent_toolbox import Toolbox

    tb = Toolbox()
    result = tb.scan_command("rm -rf /")
    print(result.verdict)   # BLOCK

    result = tb.scan_url("http://169.254.169.254/latest/meta-data/")
    print(result.verdict)   # BLOCK

    result = tb.scan_sql("SELECT * FROM users")
    print(result.verdict)   # PASS

All methods return typed Pydantic models.  Set ``raise_on_block=True`` to have
:class:`~agent_toolbox.exceptions.BlockedError` raised automatically whenever
the API returns a ``BLOCK`` verdict.
"""

from __future__ import annotations

from typing import Any, Optional

from ._client import DEFAULT_BASE_URL, _RawClient
from .exceptions import APIError, BlockedError, FlaggedError, ToolboxError
from .models import (
    AgentToolArgsRequest,
    AgentToolArgsResponse,
    ComplianceSanctionsRequest,
    ComplianceSanctionsResponse,
    CountTokensMessagesResponse,
    CountTokensRequest,
    CountTokensTextResponse,
    DeadlineDirection,
    DeadlineMode,
    DistillRequest,
    DistillResponse,
    EnforcementMode,
    FinanceOrderRiskRequest,
    FinanceOrderRiskResponse,
    FinancePositionCheckRequest,
    FinancePositionCheckResponse,
    FinancePriceRequest,
    FinancePriceResponse,
    FinanceSlippageRequest,
    FinanceSlippageResponse,
    FinanceSymbolRequest,
    FinanceSymbolResponse,
    FinanceTokenRiskRequest,
    FinanceTokenRiskResponse,
    FinanceUnitsRequest,
    FinanceUnitsResponse,
    HealthRxCheckRequest,
    HealthRxCheckResponse,
    InfraPlanRiskRequest,
    InfraPlanRiskResponse,
    Language,
    LegalCiteRequest,
    LegalCiteResponse,
    LegalDeadlineRequest,
    LegalDeadlineResponse,
    Message,
    Medication,
    OutputType,
    PricingResponse,
    ScanCommandRequest,
    ScanCommandResponse,
    ScanInjectionRequest,
    ScanInjectionResponse,
    ScanPiiRequest,
    ScanPiiResponse,
    ScanSecretsRequest,
    ScanSecretsResponse,
    ScanSqlRequest,
    ScanSqlResponse,
    ScanUrlRequest,
    ScanUrlResponse,
    ScanVulnerabilitiesRequest,
    ScanVulnerabilitiesResponse,
    ServiceMetaResponse,
    ValidateIdentifierRequest,
    ValidateIdentifierResponse,
    ValidateImportsRequest,
    ValidateImportsResponse,
    ValidateSchemaRequest,
    ValidateSchemaResponse,
    VerifyRequest,
    VerifyResponse,
)

__all__ = [
    # Main client
    "Toolbox",
    # Exceptions
    "ToolboxError",
    "APIError",
    "BlockedError",
    "FlaggedError",
    # Request / response models — re-exported for convenience
    "ScanCommandRequest",
    "ScanCommandResponse",
    "ScanUrlRequest",
    "ScanUrlResponse",
    "ScanSqlRequest",
    "ScanSqlResponse",
    "ScanPiiRequest",
    "ScanPiiResponse",
    "ScanSecretsRequest",
    "ScanSecretsResponse",
    "ScanInjectionRequest",
    "ScanInjectionResponse",
    "ScanVulnerabilitiesRequest",
    "ScanVulnerabilitiesResponse",
    "VerifyRequest",
    "VerifyResponse",
    "ValidateImportsRequest",
    "ValidateImportsResponse",
    "ValidateIdentifierRequest",
    "ValidateIdentifierResponse",
    "ValidateSchemaRequest",
    "ValidateSchemaResponse",
    "DistillRequest",
    "DistillResponse",
    "CountTokensRequest",
    "CountTokensTextResponse",
    "CountTokensMessagesResponse",
    "FinanceUnitsRequest",
    "FinanceUnitsResponse",
    "FinancePriceRequest",
    "FinancePriceResponse",
    "FinanceSymbolRequest",
    "FinanceSymbolResponse",
    "FinanceTokenRiskRequest",
    "FinanceTokenRiskResponse",
    "FinanceSlippageRequest",
    "FinanceSlippageResponse",
    "FinanceOrderRiskRequest",
    "FinanceOrderRiskResponse",
    "FinancePositionCheckRequest",
    "FinancePositionCheckResponse",
    "ComplianceSanctionsRequest",
    "ComplianceSanctionsResponse",
    "HealthRxCheckRequest",
    "HealthRxCheckResponse",
    "AgentToolArgsRequest",
    "AgentToolArgsResponse",
    "InfraPlanRiskRequest",
    "InfraPlanRiskResponse",
    "LegalCiteRequest",
    "LegalCiteResponse",
    "LegalDeadlineRequest",
    "LegalDeadlineResponse",
    "ServiceMetaResponse",
    "PricingResponse",
    "Message",
    "Medication",
]

_VERDICT_FIELDS = ("verdict",)


def _maybe_raise(verdict: str, response: Any, raise_on_block: bool, raise_on_flag: bool) -> None:
    if raise_on_block and verdict == "BLOCK":
        raise BlockedError(verdict, response)
    if raise_on_flag and verdict == "FLAG":
        raise FlaggedError(verdict, response)


class Toolbox:
    """High-level client for the agent-toolbox.ai API.

    Args:
        base_url: Override the API base URL (default: ``https://api.agent-toolbox.ai``).
        api_key:  Bearer token / API key.  Omit to use the free tier
                  (10 calls per IP, no auth required).
        raise_on_block: If ``True``, raise :class:`BlockedError` when the
                        API returns a ``BLOCK`` verdict.  Default: ``False``.
        raise_on_flag:  If ``True``, raise :class:`FlaggedError` when the
                        API returns a ``FLAG`` verdict.  Default: ``False``.
        timeout:  HTTP request timeout in seconds.  Default: 30.
    """

    def __init__(
        self,
        base_url: str = DEFAULT_BASE_URL,
        api_key: Optional[str] = None,
        raise_on_block: bool = False,
        raise_on_flag: bool = False,
        timeout: float = 30.0,
    ) -> None:
        self._http = _RawClient(base_url=base_url, api_key=api_key, timeout=timeout)
        self._raise_on_block = raise_on_block
        self._raise_on_flag = raise_on_flag

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _post(self, path: str, body: dict[str, Any]) -> dict[str, Any]:
        return self._http.post(path, body)

    def _get(self, path: str) -> dict[str, Any]:
        return self._http.get(path)

    def _check_verdict(self, result: Any) -> None:
        verdict = getattr(result, "verdict", None)
        if verdict:
            _maybe_raise(verdict, result, self._raise_on_block, self._raise_on_flag)

    # ------------------------------------------------------------------
    # Security tools
    # ------------------------------------------------------------------

    def scan_command(
        self,
        command: str,
        shell: Optional[str] = None,
        policy: Optional[dict[str, Any]] = None,
    ) -> ScanCommandResponse:
        """Scan a shell command for dangerous operations.

        Args:
            command: The shell command string to evaluate.
            shell:   Shell variant (``"bash"``, ``"sh"``, ``"zsh"``,
                     ``"powershell"``, ``"generic"``).
            policy:  Optional policy dict (``blockSeverityAtOrAbove``,
                     ``allow``, ``protectedRefs``, ``maxSegments``).

        Returns:
            :class:`ScanCommandResponse` with a ``verdict`` of PASS / FLAG / BLOCK.
        """
        req = ScanCommandRequest(command=command, shell=shell)
        body: dict[str, Any] = req.model_dump(by_alias=True, exclude_none=True)
        if policy:
            body["policy"] = policy
        raw = self._post("/v1/scan/command", body)
        result = ScanCommandResponse.model_validate(raw)
        self._check_verdict(result)
        return result

    def scan_url(
        self,
        url: str,
        policy: Optional[dict[str, Any]] = None,
    ) -> ScanUrlResponse:
        """Scan a URL for SSRF risks and policy violations.

        Args:
            url:    The URL to evaluate.
            policy: Optional policy dict.

        Returns:
            :class:`ScanUrlResponse` with verdict PASS / FLAG / BLOCK.
        """
        req = ScanUrlRequest(url=url)
        body: dict[str, Any] = req.model_dump(by_alias=True, exclude_none=True)
        if policy:
            body["policy"] = policy
        raw = self._post("/v1/scan/url", body)
        result = ScanUrlResponse.model_validate(raw)
        self._check_verdict(result)
        return result

    def scan_sql(
        self,
        sql: str,
        dialect: Optional[str] = None,
        policy: Optional[dict[str, Any]] = None,
    ) -> ScanSqlResponse:
        """Scan a SQL statement for dangerous operations.

        Args:
            sql:     SQL text to evaluate.
            dialect: One of ``"postgres"``, ``"mysql"``, ``"sqlite"``,
                     ``"tsql"``, ``"generic"``.
            policy:  Optional policy dict.

        Returns:
            :class:`ScanSqlResponse` with verdict PASS / FLAG / BLOCK.
        """
        req = ScanSqlRequest(sql=sql, dialect=dialect)  # type: ignore[arg-type]
        body: dict[str, Any] = req.model_dump(by_alias=True, exclude_none=True)
        if policy:
            body["policy"] = policy
        raw = self._post("/v1/scan/sql", body)
        result = ScanSqlResponse.model_validate(raw)
        self._check_verdict(result)
        return result

    def scan_pii(
        self,
        text: str,
        filename: Optional[str] = None,
        policy: Optional[dict[str, Any]] = None,
    ) -> ScanPiiResponse:
        """Scan text for PII / PHI / PCI before passing it to an LLM.

        Returns:
            :class:`ScanPiiResponse` with verdict PASS / FLAG / BLOCK.
        """
        req = ScanPiiRequest(text=text, filename=filename)
        body: dict[str, Any] = req.model_dump(by_alias=True, exclude_none=True)
        if policy:
            body["policy"] = policy
        raw = self._post("/v1/scan/pii", body)
        result = ScanPiiResponse.model_validate(raw)
        self._check_verdict(result)
        return result

    def scan_secrets(self, code: str, filename: Optional[str] = None) -> ScanSecretsResponse:
        """Scan source code for hardcoded secrets and credentials.

        Returns:
            :class:`ScanSecretsResponse`.
        """
        req = ScanSecretsRequest(code=code, filename=filename)
        raw = self._post("/v1/scan/secrets", req.model_dump(by_alias=True, exclude_none=True))
        return ScanSecretsResponse.model_validate(raw)

    def scan_injection(self, input: str, context: Optional[str] = None) -> ScanInjectionResponse:
        """Detect prompt injection attacks in user-supplied text.

        Returns:
            :class:`ScanInjectionResponse`.
        """
        req = ScanInjectionRequest(input=input, context=context)
        raw = self._post("/v1/scan/injection", req.model_dump(by_alias=True, exclude_none=True))
        return ScanInjectionResponse.model_validate(raw)

    def scan_vulnerabilities(
        self,
        packages: list[str],
        language: str,
    ) -> ScanVulnerabilitiesResponse:
        """Scan packages for known CVEs via OSV.

        Args:
            packages: List of package name strings (e.g. ``["requests==2.28.0"]``).
            language: One of ``"python"``, ``"javascript"``, ``"typescript"``,
                      ``"rust"``, ``"go"``.

        Returns:
            :class:`ScanVulnerabilitiesResponse`.
        """
        req = ScanVulnerabilitiesRequest(packages=packages, language=language)  # type: ignore[arg-type]
        raw = self._post("/v1/scan/vulnerabilities", req.model_dump(by_alias=True, exclude_none=True))
        return ScanVulnerabilitiesResponse.model_validate(raw)

    # ------------------------------------------------------------------
    # Core / LLM tools
    # ------------------------------------------------------------------

    def verify(
        self,
        llm_response: str,
        output_type: str = "natural_language",
        language: Optional[str] = None,
        enforcement_mode: str = "block",
    ) -> VerifyResponse:
        """Firewall an LLM response — verify claims and detect hallucinations.

        Args:
            llm_response:    The raw text produced by an LLM.
            output_type:     One of ``"code"``, ``"natural_language"``,
                             ``"agent_action"``, ``"factual_claim"``.
            language:        For code output types; one of the supported languages.
            enforcement_mode: ``"block"``, ``"flag"``, or ``"audit"``.

        Returns:
            :class:`VerifyResponse` with verdict PASS / FLAG / BLOCK.
        """
        req = VerifyRequest(
            llmResponse=llm_response,
            outputType=output_type,  # type: ignore[arg-type]
            language=language,  # type: ignore[arg-type]
            enforcementMode=enforcement_mode,  # type: ignore[arg-type]
        )
        raw = self._post("/v1/verify", req.model_dump(by_alias=True, exclude_none=True))
        result = VerifyResponse.model_validate(raw)
        self._check_verdict(result)
        return result

    def validate_imports(self, code: str, language: str) -> ValidateImportsResponse:
        """Detect hallucinated package imports in LLM-generated code.

        Returns:
            :class:`ValidateImportsResponse`.
        """
        req = ValidateImportsRequest(code=code, language=language)  # type: ignore[arg-type]
        raw = self._post("/v1/validate/imports", req.model_dump(by_alias=True, exclude_none=True))
        return ValidateImportsResponse.model_validate(raw)

    def validate_identifier(
        self,
        value: Optional[str] = None,
        values: Optional[list[str]] = None,
        type: Optional[str] = None,
        types: Optional[list[str]] = None,
    ) -> ValidateIdentifierResponse:
        """Validate structured identifiers (IBAN, SSN, EIN, Solana address, …).

        Returns:
            :class:`ValidateIdentifierResponse` with verdict PASS / FLAG / BLOCK.
        """
        req = ValidateIdentifierRequest(
            value=value,
            values=values,
            type=type,  # type: ignore[arg-type]
            types=types,  # type: ignore[arg-type]
        )
        raw = self._post("/v1/validate/identifier", req.model_dump(by_alias=True, exclude_none=True))
        result = ValidateIdentifierResponse.model_validate(raw)
        self._check_verdict(result)
        return result

    def validate_schema(
        self,
        schema: dict[str, Any],
        data: Any = None,
        policy: Optional[dict[str, Any]] = None,
    ) -> ValidateSchemaResponse:
        """Validate data against a JSON Schema.

        Returns:
            :class:`ValidateSchemaResponse` with verdict PASS / FLAG / BLOCK.
        """
        req = ValidateSchemaRequest(schema=schema, data=data)
        body: dict[str, Any] = req.model_dump(by_alias=True, exclude_none=True)
        if policy:
            body["policy"] = policy
        raw = self._post("/v1/validate/schema", body)
        result = ValidateSchemaResponse.model_validate(raw)
        self._check_verdict(result)
        return result

    def distill(
        self,
        messages: list[dict[str, str]],
        target_tokens: int = 4000,
        preserve_system_prompt: bool = True,
    ) -> DistillResponse:
        """Compress a message list to fit within a token budget.

        Args:
            messages:             List of ``{"role": ..., "content": ...}`` dicts.
            target_tokens:        Target token count after compression.
            preserve_system_prompt: Keep the system message intact.

        Returns:
            :class:`DistillResponse`.
        """
        msgs = [Message(**m) for m in messages]
        req = DistillRequest(
            messages=msgs,
            targetTokens=target_tokens,
            preserveSystemPrompt=preserve_system_prompt,
        )
        raw = self._post("/v1/distill", req.model_dump(by_alias=True, exclude_none=True))
        return DistillResponse.model_validate(raw)

    def count_tokens(
        self,
        text: Optional[str] = None,
        messages: Optional[list[dict[str, str]]] = None,
        model: str = "generic",
    ) -> dict[str, Any]:
        """Count approximate tokens before sending to an LLM.

        Returns the raw dict because the response schema varies between
        text and message-based inputs (see :data:`CountTokensResponse`).
        """
        body: dict[str, Any] = {"model": model}
        if text is not None:
            body["text"] = text
        if messages is not None:
            body["messages"] = messages
        return self._post("/v1/tokens/count", body)

    # ------------------------------------------------------------------
    # Finance tools
    # ------------------------------------------------------------------

    def finance_units(
        self,
        token_address: str,
        raw_amount: str,
        ui_amount: float,
        chain: str,
    ) -> FinanceUnitsResponse:
        """Guard against decimal-scaling errors in on-chain amounts.

        Returns:
            :class:`FinanceUnitsResponse` with verdict PASS / FLAG / BLOCK.
        """
        req = FinanceUnitsRequest(
            tokenAddress=token_address,
            rawAmount=raw_amount,
            uiAmount=ui_amount,
            chain=chain,  # type: ignore[arg-type]
        )
        raw = self._post("/v1/finance/units", req.model_dump(by_alias=True, exclude_none=True))
        result = FinanceUnitsResponse.model_validate(raw)
        self._check_verdict(result)
        return result

    def finance_price(
        self,
        asset_type: str,
        symbol: Optional[str] = None,
        token_address: Optional[str] = None,
        proposed_price: Optional[float] = None,
    ) -> FinancePriceResponse:
        """Cross-validate an asset price against multiple oracle sources.

        Returns:
            :class:`FinancePriceResponse` with verdict PASS / FLAG / BLOCK.
        """
        req = FinancePriceRequest(
            assetType=asset_type,  # type: ignore[arg-type]
            symbol=symbol,
            tokenAddress=token_address,
            proposedPrice=proposed_price,
        )
        raw = self._post("/v1/finance/price", req.model_dump(by_alias=True, exclude_none=True))
        result = FinancePriceResponse.model_validate(raw)
        self._check_verdict(result)
        return result

    def finance_symbol(
        self,
        symbol: str,
        asset_type: str,
        expected_name: Optional[str] = None,
        chain: Optional[str] = None,
    ) -> FinanceSymbolResponse:
        """Resolve a ticker / token symbol, detecting imposter tokens.

        Returns:
            :class:`FinanceSymbolResponse` with verdict PASS / FLAG / BLOCK.
        """
        req = FinanceSymbolRequest(
            symbol=symbol,
            assetType=asset_type,  # type: ignore[arg-type]
            expectedName=expected_name,
            chain=chain,
        )
        raw = self._post("/v1/finance/symbol", req.model_dump(by_alias=True, exclude_none=True))
        result = FinanceSymbolResponse.model_validate(raw)
        self._check_verdict(result)
        return result

    def finance_token_risk(
        self,
        address: str,
        chain: str,
        max_rug_score: Optional[float] = None,
        require_lp_locked: Optional[bool] = None,
    ) -> FinanceTokenRiskResponse:
        """Run a rug-pull risk assessment on a token via RugCheck.

        Returns:
            :class:`FinanceTokenRiskResponse` with verdict PASS / FLAG / BLOCK.
        """
        req = FinanceTokenRiskRequest(
            address=address,
            chain=chain,  # type: ignore[arg-type]
            maxRugScore=max_rug_score,
            requireLpLocked=require_lp_locked,
        )
        raw = self._post("/v1/finance/token/risk", req.model_dump(by_alias=True, exclude_none=True))
        result = FinanceTokenRiskResponse.model_validate(raw)
        self._check_verdict(result)
        return result

    def finance_slippage(
        self,
        token_address: str,
        chain: str,
        trade_usd: float,
        max_price_impact_pct: Optional[float] = None,
    ) -> FinanceSlippageResponse:
        """Check trade slippage and pool liquidity.

        Returns:
            :class:`FinanceSlippageResponse` with verdict PASS / FLAG / BLOCK.
        """
        req = FinanceSlippageRequest(
            tokenAddress=token_address,
            chain=chain,
            tradeUsd=trade_usd,
            maxPriceImpactPct=max_price_impact_pct,
        )
        raw = self._post("/v1/finance/slippage", req.model_dump(by_alias=True, exclude_none=True))
        result = FinanceSlippageResponse.model_validate(raw)
        self._check_verdict(result)
        return result

    def finance_order_risk(
        self,
        asset_type: str,
        side: str,
        trade_usd: float,
        symbol: Optional[str] = None,
        token_address: Optional[str] = None,
        portfolio_value_usd: Optional[float] = None,
        chain: Optional[str] = None,
        leverage: Optional[float] = None,
    ) -> FinanceOrderRiskResponse:
        """Composite order risk check (price + slippage + token risk).

        Returns:
            :class:`FinanceOrderRiskResponse` with verdict PASS / FLAG / BLOCK.
        """
        req = FinanceOrderRiskRequest(
            assetType=asset_type,  # type: ignore[arg-type]
            side=side,  # type: ignore[arg-type]
            tradeUsd=trade_usd,
            symbol=symbol,
            tokenAddress=token_address,
            portfolioValueUsd=portfolio_value_usd,
            chain=chain,
            leverage=leverage,
        )
        raw = self._post("/v1/finance/order/risk", req.model_dump(by_alias=True, exclude_none=True))
        result = FinanceOrderRiskResponse.model_validate(raw)
        self._check_verdict(result)
        return result

    def finance_position_check(
        self,
        trade: dict[str, Any],
        portfolio: dict[str, Any],
        rules: Optional[dict[str, Any]] = None,
    ) -> FinancePositionCheckResponse:
        """Enforce portfolio risk rules before executing a trade.

        Args:
            trade:     Dict with ``symbol``, ``side``, ``tradeUsd``, ``assetType``.
            portfolio: Dict with ``totalValueUsd``, ``cashUsd``.
            rules:     Optional dict with ``maxPositionPct``, ``killSwitch``, etc.

        Returns:
            :class:`FinancePositionCheckResponse` with verdict PASS / FLAG / BLOCK.
        """
        body: dict[str, Any] = {"trade": trade, "portfolio": portfolio}
        if rules:
            body["rules"] = rules
        raw = self._post("/v1/finance/position/check", body)
        result = FinancePositionCheckResponse.model_validate(raw)
        self._check_verdict(result)
        return result

    # ------------------------------------------------------------------
    # Compliance
    # ------------------------------------------------------------------

    def compliance_sanctions(
        self,
        name: Optional[str] = None,
        names: Optional[list[str]] = None,
        fuzzy: bool = True,
        min_score: Optional[float] = None,
    ) -> ComplianceSanctionsResponse:
        """Screen names against OFAC, UN, EU, and other sanctions lists.

        Returns:
            :class:`ComplianceSanctionsResponse` with verdict PASS / FLAG / BLOCK.
        """
        req = ComplianceSanctionsRequest(name=name, names=names, fuzzy=fuzzy, min_score=min_score)
        raw = self._post("/v1/compliance/sanctions", req.model_dump(by_alias=True, exclude_none=True))
        result = ComplianceSanctionsResponse.model_validate(raw)
        self._check_verdict(result)
        return result

    # ------------------------------------------------------------------
    # Health
    # ------------------------------------------------------------------

    def health_rx_check(
        self,
        medications: list[dict[str, Any]],
        patient: Optional[dict[str, Any]] = None,
        policy: Optional[dict[str, Any]] = None,
    ) -> HealthRxCheckResponse:
        """Check medications for drug interactions and dosing errors.

        Args:
            medications: List of dicts with at minimum ``{"name": "..."}`` plus
                         optional ``dose``, ``unit``, ``route``, ``frequencyPerDay``.
            patient:     Optional patient context (``weightKg``, ``ageYears``).
            policy:      Optional enforcement policy.

        Returns:
            :class:`HealthRxCheckResponse` with verdict PASS / FLAG / BLOCK.
        """
        body: dict[str, Any] = {"medications": medications}
        if patient:
            body["patient"] = patient
        if policy:
            body["policy"] = policy
        raw = self._post("/v1/health/rx/check", body)
        result = HealthRxCheckResponse.model_validate(raw)
        self._check_verdict(result)
        return result

    # ------------------------------------------------------------------
    # Agent / infra tools
    # ------------------------------------------------------------------

    def agent_tool_args(
        self,
        args: dict[str, Any],
        schema: dict[str, Any],
        tool: Optional[str] = None,
        policy: Optional[dict[str, Any]] = None,
    ) -> AgentToolArgsResponse:
        """Validate agent tool arguments against a schema before execution.

        Returns:
            :class:`AgentToolArgsResponse` with verdict PASS / FLAG / BLOCK.
        """
        body: dict[str, Any] = {"args": args, "schema": schema}
        if tool:
            body["tool"] = tool
        if policy:
            body["policy"] = policy
        raw = self._post("/v1/agent/tool/args", body)
        result = AgentToolArgsResponse.model_validate(raw)
        self._check_verdict(result)
        return result

    def infra_plan_risk(
        self,
        format: str,
        document: Any = None,
        policy: Optional[dict[str, Any]] = None,
    ) -> InfraPlanRiskResponse:
        """Scan Terraform / IAM / k8s plans for security risks.

        Args:
            format:   One of ``"terraform"``, ``"iam"``, ``"k8s"``.
            document: The plan document (dict, list, or string).
            policy:   Optional policy dict.

        Returns:
            :class:`InfraPlanRiskResponse` with verdict PASS / FLAG / BLOCK.
        """
        body: dict[str, Any] = {"format": format}
        if document is not None:
            body["document"] = document
        if policy:
            body["policy"] = policy
        raw = self._post("/v1/infra/plan/risk", body)
        result = InfraPlanRiskResponse.model_validate(raw)
        self._check_verdict(result)
        return result

    # ------------------------------------------------------------------
    # Legal
    # ------------------------------------------------------------------

    def legal_cite(
        self,
        citation: Optional[str] = None,
        citations: Optional[list[str]] = None,
        source_text: Optional[str] = None,
        quote: Optional[str] = None,
    ) -> LegalCiteResponse:
        """Validate legal citations and check quoted text.

        Returns:
            :class:`LegalCiteResponse` with verdict PASS / FLAG / BLOCK.
        """
        req = LegalCiteRequest(
            citation=citation,
            citations=citations,
            sourceText=source_text,
            quote=quote,
        )
        raw = self._post("/v1/legal/cite", req.model_dump(by_alias=True, exclude_none=True))
        result = LegalCiteResponse.model_validate(raw)
        self._check_verdict(result)
        return result

    def legal_deadline(
        self,
        start: str,
        days: int,
        mode: Optional[str] = None,
        direction: Optional[str] = None,
        jurisdiction: Optional[str] = None,
    ) -> LegalDeadlineResponse:
        """Compute a court or calendar deadline, skipping weekends and holidays.

        Args:
            start:        ISO-8601 date string (e.g. ``"2025-01-15"``).
            days:         Number of days to count.
            mode:         ``"court"`` or ``"calendar"``.
            direction:    ``"after"`` or ``"before"``.
            jurisdiction: Jurisdiction code for holiday calendar.

        Returns:
            :class:`LegalDeadlineResponse`.
        """
        req = LegalDeadlineRequest(
            start=start,
            days=days,
            mode=mode,  # type: ignore[arg-type]
            direction=direction,  # type: ignore[arg-type]
            jurisdiction=jurisdiction,
        )
        raw = self._post("/v1/legal/deadline", req.model_dump(by_alias=True, exclude_none=True))
        result = LegalDeadlineResponse.model_validate(raw)
        self._check_verdict(result)
        return result

    # ------------------------------------------------------------------
    # Metadata endpoints
    # ------------------------------------------------------------------

    def meta(self) -> ServiceMetaResponse:
        """Fetch service metadata (version, available endpoints, docs URL)."""
        raw = self._get("/")
        return ServiceMetaResponse.model_validate(raw)

    def pricing(self) -> PricingResponse:
        """Fetch current pricing information for all endpoints."""
        raw = self._get("/v1/pricing")
        return PricingResponse.model_validate(raw)
