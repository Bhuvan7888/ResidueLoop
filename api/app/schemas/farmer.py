from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class FarmerProfileCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=120)
    village_id: str = Field(min_length=1)
    language: Literal["en", "pa"]


class PlotCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    village_id: str = Field(min_length=1)
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    acres: float = Field(gt=0, le=500)
