from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class BuyerProfileCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    org_name: str = Field(min_length=1, max_length=120)
    type: Literal["biomass", "cbg", "kiln", "mill"]
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    capacity: int = Field(gt=0)
    price_per_tonne: float = Field(gt=0)
    min_load_tonnes: float = Field(gt=0)


class DemandPostCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tonnes_needed: float = Field(gt=0)
    price_per_tonne: float = Field(gt=0)
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    date_from: date
    date_to: date


class DemandPostUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tonnes_needed: float | None = Field(default=None, gt=0)
    price_per_tonne: float | None = Field(default=None, gt=0)
    status: Literal["open", "fulfilled", "closed"] | None = None


class ListingCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    plot_id: str = Field(min_length=1)
    harvest_date: date
    combine_sms_used: bool
    est_tonnes: float = Field(gt=0)
