from datetime import date
from typing import Optional
from app.core.config import get_settings

class SentinelClient:
    def __init__(self) -> None:
        self.settings = get_settings()

    async def _get_token(self) -> Optional[str]:
        import httpx
        url = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
        data = {
            "grant_type": "client_credentials",
            "client_id": self.settings.cdse_client_id,
            "client_secret": self.settings.cdse_client_secret
        }
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(url, data=data, timeout=10.0)
                if resp.status_code == 200:
                    token = resp.json().get("access_token")
                    return str(token) if token else None
            except Exception:
                pass
        return None

    async def get_nbr_change(self, lat: float, lon: float, date_start: date, date_end: date) -> Optional[float]:
        import httpx
        import math
        
        if self.settings.cdse_client_id in ("mock", "", None):
            return 0.0
            
        token = await self._get_token()
        if not token:
            return None
            
        radius_km = 0.05
        delta_lat = radius_km / 111.0
        delta_lon = radius_km / (111.0 * math.cos(math.radians(lat)))
        bbox = [lon - delta_lon, lat - delta_lat, lon + delta_lon, lat + delta_lat]
        
        evalscript = """
        //VERSION=3
        function setup() {
            return {
                input: ["B08", "B12", "SCL"],
                output: [
                    { id: "nbr", bands: 1 },
                    { id: "dataMask", bands: 1 }
                ]
            };
        }
        function evaluatePixel(samples) {
            let cloud = [3, 8, 9, 10, 11].includes(samples.SCL);
            if (cloud) {
                return { nbr: [0], dataMask: [0] };
            }
            let nbr = (samples.B08 - samples.B12) / (samples.B08 + samples.B12);
            return { nbr: [nbr], dataMask: [1] };
        }
        """
        
        payload = {
            "input": {
                "bounds": {"bbox": bbox},
                "data": [{
                    "type": "sentinel-2-l2a",
                    "dataFilter": {
                        "timeRange": {
                            "from": f"{date_start.isoformat()}T00:00:00Z",
                            "to": f"{date_end.isoformat()}T23:59:59Z"
                        }
                    }
                }]
            },
            "aggregation": {
                "timeRange": {
                    "from": f"{date_start.isoformat()}T00:00:00Z",
                    "to": f"{date_end.isoformat()}T23:59:59Z"
                },
                "aggregationInterval": {"of": "P1D"},
                "evalscript": evalscript
            }
        }
        
        url = "https://sh.dataspace.copernicus.eu/api/v1/statistics"
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(url, json=payload, headers=headers, timeout=20.0)
                if resp.status_code == 200:
                    data = resp.json().get("data", [])
                    valid_nbrs = []
                    for entry in data:
                        outputs = entry.get("outputs", {}).get("nbr", {}).get("bands", {}).get("B0", {})
                        if outputs:
                            stats = outputs.get("stats", {})
                            if stats.get("sampleCount", 0) > 0:
                                valid_nbrs.append(stats.get("mean"))
                                
                    if len(valid_nbrs) >= 2:
                        return float(valid_nbrs[0] - valid_nbrs[-1])
            except Exception:
                pass
        return None
