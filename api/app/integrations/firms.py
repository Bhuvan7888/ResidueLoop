from datetime import date
from app.core.config import get_settings

class FirmsClient:
    def __init__(self) -> None:
        self.settings = get_settings()

    async def get_fire_hits(self, lat: float, lon: float, radius_km: float, date_start: date, date_end: date) -> int:
        import httpx
        import math
        
        if self.settings.nasa_firms_map_key in ("mock", "", None):
            return 0
            
        delta_lat = radius_km / 111.0
        delta_lon = radius_km / (111.0 * math.cos(math.radians(lat)))
        
        W = lon - delta_lon
        S = lat - delta_lat
        E = lon + delta_lon
        N = lat + delta_lat
        
        days_range = (date_end - date_start).days
        days_range = min(max(1, days_range), 10)
        
        url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{self.settings.nasa_firms_map_key}/VIIRS_NOAA21_NRT/{W},{S},{E},{N}/{days_range}/{date_start.isoformat()}"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, timeout=10.0)
                if response.status_code == 200:
                    lines = response.text.strip().split("\n")
                    if len(lines) > 1:
                        return len(lines) - 1
            except Exception:
                pass
        return 0
