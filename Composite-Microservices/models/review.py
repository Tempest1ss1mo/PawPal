from __future__ import annotations
from typing import Optional
from uuid import UUID, uuid4
from datetime import datetime
from pydantic import BaseModel, Field


class ReviewBase(BaseModel):
    """Core attributes of a review for a walk."""

    walk_id: UUID = Field(
        ...,
        description="Unique ID of the walk being reviewed.",
        json_schema_extra={"example": "99999999-9999-4999-8999-999999999999"},
    )
    reviewer_id: UUID = Field(
        ...,
        description="Unique ID of the user writing the review (owner or walker).",
        json_schema_extra={"example": "11111111-1111-4111-8111-111111111111"},
    )
    reviewee_id: UUID = Field(
        ...,
        description="Unique ID of the user being reviewed (walker if reviewer is owner, owner if reviewer is walker).",
        json_schema_extra={"example": "22222222-2222-4222-8222-222222222222"},
    )
    rating: int = Field(
        ...,
        ge=1,
        le=5,
        description="Rating from 1 to 5 stars.",
        json_schema_extra={"example": 5},
    )
    comment: Optional[str] = Field(
        None,
        description="Optional text review comment.",
        json_schema_extra={"example": "Great walk! Very professional and punctual."},
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "walk_id": "99999999-9999-4999-8999-999999999999",
                    "reviewer_id": "11111111-1111-4111-8111-111111111111",
                    "reviewee_id": "22222222-2222-4222-8222-222222222222",
                    "rating": 5,
                    "comment": "Great walk! Very professional and punctual.",
                }
            ]
        }
    }


class ReviewCreate(ReviewBase):
    """Payload for creating a new review."""
    id: UUID = Field(
        default_factory=uuid4,
        description="Server-generated review ID.",
        json_schema_extra={"example": "88888888-8888-4888-8888-888888888888"},
    )


class ReviewUpdate(BaseModel):
    """Partial update for an existing review."""
    rating: Optional[int] = Field(None, ge=1, le=5, description="Updated rating.")
    comment: Optional[str] = Field(None, description="Updated comment.")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"rating": 4},
                {"comment": "Updated: Walk was good but could be better."},
            ]
        }
    }


class ReviewRead(ReviewBase):
    """Server representation returned to clients."""
    id: UUID = Field(default_factory=uuid4)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "88888888-8888-4888-8888-888888888888",
                    "walk_id": "99999999-9999-4999-8999-999999999999",
                    "reviewer_id": "11111111-1111-4111-8111-111111111111",
                    "reviewee_id": "22222222-2222-4222-8222-222222222222",
                    "rating": 5,
                    "comment": "Great walk! Very professional and punctual.",
                    "created_at": "2025-10-12T16:00:00Z",
                    "updated_at": "2025-10-12T16:00:00Z",
                }
            ]
        }
    }


