"""Review models matching the actual Review Service API."""
from __future__ import annotations
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class ReviewCreate(BaseModel):
    """Payload for creating a new review - matches Review Service API."""
    walkId: str = Field(..., description="ID of the walk being reviewed")
    ownerId: str = Field(..., description="ID of the pet owner")
    walkerId: str = Field(..., description="ID of the walker")
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")
    comment: Optional[str] = Field(None, description="Review comment")


class ReviewUpdate(BaseModel):
    """Partial update for an existing review."""
    rating: Optional[int] = Field(None, ge=1, le=5, description="Updated rating")
    comment: Optional[str] = Field(None, description="Updated comment")


class Review(BaseModel):
    """Review model matching Review Service response."""
    id: str = Field(..., description="Review ID")
    walkId: str = Field(..., description="ID of the walk")
    ownerId: str = Field(..., description="ID of the pet owner")
    walkerId: str = Field(..., description="ID of the walker")
    rating: int = Field(..., description="Rating 1-5")
    comment: Optional[str] = Field(None, description="Review comment")
    createdAt: Optional[str] = Field(None, description="Creation timestamp")
    updatedAt: Optional[str] = Field(None, description="Update timestamp")

    model_config = {"extra": "allow"}
