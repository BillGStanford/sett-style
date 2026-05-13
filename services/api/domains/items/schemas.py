"""Items Domain — Pydantic Schemas"""

from pydantic import BaseModel, AnyHttpUrl, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


class ItemClipSchema(BaseModel):
    url: AnyHttpUrl


class ItemCreateSchema(BaseModel):
    original_url: str
    product_name: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None


class ItemLinkUpdateSchema(BaseModel):
    """Body for PATCH /api/items/{id}/link — creator sets link info on an item."""
    linked_url: str = Field(..., min_length=1, description="External URL to link")
    linked_title: str = Field(..., min_length=1, description="Display title for the link")
    linked_description: Optional[str] = Field(None, max_length=1000, description="Optional description")
    linked_image_url: Optional[str] = Field(None, description="Custom image URL for the link card")


class ItemResponseSchema(BaseModel):
    id: UUID
    user_id: UUID
    original_url: Optional[str]
    affiliate_url: Optional[str]
    processed_image_url: Optional[str]
    product_name: Optional[str]
    price: Optional[float]
    currency: str = "USD"
    category: Optional[str]
    brand: Optional[str]
    merchant: Optional[str] = None
    status: str
    created_at: datetime
    # Linked item fields — set by creator in canvas properties panel
    linked_url: Optional[str] = None
    linked_title: Optional[str] = None
    linked_description: Optional[str] = None
    linked_image_url: Optional[str] = None

    model_config = {"from_attributes": True}