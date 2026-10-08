from app.integrations.http import SharedHttpClient
from app.core.config import get_settings

class OpenMeteoClient:
    def __init__(self) -> None:
        self.base_url = "https://api.open-meteo.com/v1/forecast"
        self.settings = get_settings()

    async def get_wind_direction(self, lat: float, lon: float) -> float:
        """
        MOCK implementation for hackathon.
        Returns the number of fire hits in the given radius and window.
        """
        # We simulate a request to prove the allowlist works
        if self.settings.nasa_firms_map_key != "mock":
            res = await SharedHttpClient.get(f"{self.base_url}?latitude={lat}&longitude={lon}&current_weather=true")
            # Parse wind direction from response
            pass
        return 315.0
