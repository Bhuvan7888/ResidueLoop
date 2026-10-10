import httpx
from urllib.parse import urlparse
from typing import Any

# Security-context outbound host allowlist
ALLOWED_HOSTS = {
    "api.open-meteo.com",
    "firms.modaps.eosdis.nasa.gov",
    "sh.dataspace.copernicus.eu"
}

class SharedHttpClient:
    @staticmethod
    def _is_allowed(url: str) -> bool:
        parsed = urlparse(url)
        return parsed.hostname in ALLOWED_HOSTS

    @staticmethod
    async def get(url: str, **kwargs: Any) -> httpx.Response:
        if not SharedHttpClient._is_allowed(url):
            raise ValueError(f"Host not in allowlist: {url}")
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            return await client.get(url, **kwargs)

    @staticmethod
    async def post(url: str, **kwargs: Any) -> httpx.Response:
        if not SharedHttpClient._is_allowed(url):
            raise ValueError(f"Host not in allowlist: {url}")
            
        async with httpx.AsyncClient(timeout=10.0) as client:
            return await client.post(url, **kwargs)
