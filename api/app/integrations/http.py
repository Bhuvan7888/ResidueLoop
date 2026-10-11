import asyncio
from typing import Any
from urllib.parse import urlparse

import httpx

# Security-context outbound host allowlist. Add a host here deliberately.
ALLOWED_HOSTS = {
    "api.open-meteo.com",
    "firms.modaps.eosdis.nasa.gov",
    "sh.dataspace.copernicus.eu",
    "generativelanguage.googleapis.com",
    "graph.facebook.com",
}

TIMEOUT_SECONDS = 10.0
MAX_ATTEMPTS = 3
RETRY_STATUS = {429, 500, 502, 503, 504}


class SharedHttpClient:
    @staticmethod
    def _check_host(url: str) -> None:
        if urlparse(url).hostname not in ALLOWED_HOSTS:
            raise ValueError(f"Host not in allowlist: {url}")

    @staticmethod
    async def request(method: str, url: str, **kwargs: Any) -> httpx.Response:
        """Allowlisted call with a timeout, no redirects, and retries with backoff on transient failures."""
        SharedHttpClient._check_host(url)
        last_error: Exception | None = None
        for attempt in range(MAX_ATTEMPTS):
            try:
                async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS, follow_redirects=False) as client:
                    response = await client.request(method, url, **kwargs)
                if response.status_code not in RETRY_STATUS:
                    return response
                last_error = httpx.HTTPStatusError("retryable status", request=response.request, response=response)
            except httpx.TransportError as error:
                last_error = error
            await asyncio.sleep(0.5 * 2**attempt)
        raise RuntimeError("Outbound request failed after retries") from last_error

    @staticmethod
    async def get(url: str, **kwargs: Any) -> httpx.Response:
        return await SharedHttpClient.request("GET", url, **kwargs)

    @staticmethod
    async def post(url: str, **kwargs: Any) -> httpx.Response:
        return await SharedHttpClient.request("POST", url, **kwargs)
