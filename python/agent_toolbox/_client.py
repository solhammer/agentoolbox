"""Low-level synchronous HTTP client for the agent-toolbox.ai API.

Uses ``httpx`` for transport. Callers should prefer the high-level ``Toolbox``
class in ``__init__.py`` rather than this module directly.
"""

from __future__ import annotations

from typing import Any, Optional

import httpx

from .exceptions import APIError

DEFAULT_BASE_URL = "https://api.agent-toolbox.ai"
DEFAULT_TIMEOUT = 30.0


class _RawClient:
    """Thin wrapper around httpx that handles auth, errors, and JSON coercion."""

    def __init__(
        self,
        base_url: str = DEFAULT_BASE_URL,
        api_key: Optional[str] = None,
        timeout: float = DEFAULT_TIMEOUT,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._timeout = timeout

    def _headers(self) -> dict[str, str]:
        headers: dict[str, str] = {"Content-Type": "application/json", "Accept": "application/json"}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"
        return headers

    def post(self, path: str, body: dict[str, Any]) -> dict[str, Any]:
        """Send a POST request and return the parsed JSON body.

        Raises:
            APIError: if the server returns a non-2xx status.
        """
        url = f"{self.base_url}{path}"
        with httpx.Client(timeout=self._timeout) as client:
            response = client.post(url, json=body, headers=self._headers())
        return self._handle(response)

    def get(self, path: str) -> dict[str, Any]:
        """Send a GET request and return the parsed JSON body."""
        url = f"{self.base_url}{path}"
        with httpx.Client(timeout=self._timeout) as client:
            response = client.get(url, headers=self._headers())
        return self._handle(response)

    @staticmethod
    def _handle(response: httpx.Response) -> dict[str, Any]:
        try:
            payload: dict[str, Any] = response.json()
        except Exception:
            payload = {}

        if not response.is_success:
            error = payload.get("error", "unknown_error")
            message = payload.get("message", response.text)
            raise APIError(response.status_code, error, message)

        return payload
