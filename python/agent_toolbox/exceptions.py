"""Exceptions raised by the agent-toolbox SDK."""

from __future__ import annotations


class ToolboxError(Exception):
    """Base exception for all agent-toolbox errors."""


class APIError(ToolboxError):
    """Raised when the API returns a non-2xx response."""

    def __init__(self, status_code: int, error: str, message: str) -> None:
        self.status_code = status_code
        self.error = error
        self.message = message
        super().__init__(f"[{status_code}] {error}: {message}")


class BlockedError(ToolboxError):
    """Raised when ``raise_on_block=True`` and the verdict is BLOCK."""

    def __init__(self, verdict: str, response: object) -> None:
        self.verdict = verdict
        self.response = response
        super().__init__(f"Request blocked by agent-toolbox (verdict={verdict})")


class FlaggedError(ToolboxError):
    """Raised when ``raise_on_flag=True`` and the verdict is FLAG."""

    def __init__(self, verdict: str, response: object) -> None:
        self.verdict = verdict
        self.response = response
        super().__init__(f"Request flagged by agent-toolbox (verdict={verdict})")
