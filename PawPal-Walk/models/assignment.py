from __future__ import annotations

from typing import Optional
from uuid import UUID, uuid4
from datetime import datetime
from pydantic import BaseModel, Field


class AssignmentBase(BaseModel):
    """Core attributes of a walk assignment — pairing a walker with a scheduled walk."""

    walk_id: UUID = Field(
        ...,
        description="Unique ID of the associated walk request.",
        json_schema_extra={"example": "11111111-1111-4111-8111-111111111111"},
    )
    walker_id: UUID = Field(
        ...,
        description="Unique ID of the dog walker accepting the walk.",
        json_schema_extra={"example": "22222222-2222-4222-8222-222222222222"},
    )
    start_time: Optional[datetime] = Field(
        None,
        description="Timestamp (UTC) when the walk actually started.",
        json_schema_extra={"example": "2025-10-12T14:45:00Z"},
    )
    end_time: Optional[datetime] = Field(
        None,
        description="Timestamp (UTC) when the walk finished.",
        json_schema_extra={"example": "2025-10-12T15:30:00Z"},
    )
    status: str = Field(
        default="pending",
        description="Assignment status: pending, in_progress, completed, cancelled.",
        json_schema_extra={"example": "pending"},
    )
    notes: Optional[str] = Field(
        None,
        description="Optional comments by the walker (e.g., dog behavior or route taken).",
        json_schema_extra={"example": "Buddy was very energetic and enjoyed the park."},
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "walk_id": "11111111-1111-4111-8111-111111111111",
                    "walker_id": "22222222-2222-4222-8222-222222222222",
                    "start_time": "2025-10-12T14:45:00Z",
                    "end_time": "2025-10-12T15:30:00Z",
                    "status": "completed",
                    "notes": "Sunny day, dog behaved well!",
                }
            ]
        }
    }


class AssignmentCreate(AssignmentBase):
    """Creation payload for a new assignment."""
    id: UUID = Field(
        default_factory=uuid4,
        description="Server-generated unique assignment ID.",
        json_schema_extra={"example": "99999999-9999-4999-8999-999999999999"},
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "walk_id": "11111111-1111-4111-8111-111111111111",
                    "walker_id": "22222222-2222-4222-8222-222222222222",
                    "status": "pending",
                }
            ]
        }
    }


class AssignmentUpdate(BaseModel):
    """Partial update for an assignment; supply only fields to change."""

    start_time: Optional[datetime] = Field(None, description="New start time if walk begins.")
    end_time: Optional[datetime] = Field(None, description="New end time if walk finishes.")
    status: Optional[str] = Field(None, description="Updated assignment status.")
    notes: Optional[str] = Field(None, description="New or edited notes by the walker.")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"status": "in_progress"},
                {"end_time": "2025-10-12T16:00:00Z"},
                {"notes": "Dog stopped to rest twice."},
            ]
        }
    }


class AssignmentRead(AssignmentBase):
    """Server representation returned to clients."""
    id: UUID = Field(
        default_factory=uuid4,
        description="Unique assignment ID.",
        json_schema_extra={"example": "99999999-9999-4999-8999-999999999999"},
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Creation timestamp (UTC).",
        json_schema_extra={"example": "2025-10-12T13:00:00Z"},
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Last update timestamp (UTC).",
        json_schema_extra={"example": "2025-10-12T14:00:00Z"},
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "99999999-9999-4999-8999-999999999999",
                    "walk_id": "11111111-1111-4111-8111-111111111111",
                    "walker_id": "22222222-2222-4222-8222-222222222222",
                    "start_time": "2025-10-12T14:45:00Z",
                    "end_time": "2025-10-12T15:30:00Z",
                    "status": "completed",
                    "notes": "Buddy enjoyed the park.",
                    "created_at": "2025-10-12T13:00:00Z",
                    "updated_at": "2025-10-12T15:31:00Z",
                }
            ]
        }
    }