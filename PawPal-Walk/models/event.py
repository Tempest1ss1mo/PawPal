from __future__ import annotations

from typing import Optional
from uuid import UUID, uuid4
from datetime import datetime
from pydantic import BaseModel, Field


class EventBase(BaseModel):
    """Represents a logged event or status update during a walk."""

    walk_id: UUID = Field(
        ...,
        description="Unique ID of the walk this event belongs to.",
        json_schema_extra={"example": "11111111-1111-4111-8111-111111111111"},
    )
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="Time the event occurred (UTC).",
        json_schema_extra={"example": "2025-10-12T15:10:00Z"},
    )
    event_type: str = Field(
        ...,
        description="Type of event: started, paused, resumed, finished, location_update, photo_uploaded, etc.",
        json_schema_extra={"example": "photo_uploaded"},
    )
    message: Optional[str] = Field(
        None,
        description="Optional description or metadata (e.g., GPS note or photo URL).",
        json_schema_extra={"example": "Dog resting under shade; uploaded /images/buddy1.jpg"},
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "walk_id": "11111111-1111-4111-8111-111111111111",
                    "timestamp": "2025-10-12T15:10:00Z",
                    "event_type": "photo_uploaded",
                    "message": "Dog resting under shade; uploaded /images/buddy1.jpg",
                },
                {
                    "walk_id": "11111111-1111-4111-8111-111111111111",
                    "event_type": "finished",
                    "message": "Returned home safely.",
                },
            ]
        }
    }


class EventCreate(EventBase):
    """Creation payload for a new event entry."""
    id: UUID = Field(
        default_factory=uuid4,
        description="Unique event ID (server-generated).",
        json_schema_extra={"example": "99999999-9999-4999-8999-999999999999"},
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "walk_id": "11111111-1111-4111-8111-111111111111",
                    "event_type": "started",
                    "message": "Walk commenced from 123 Riverside Park.",
                }
            ]
        }
    }


class EventRead(EventBase):
    """Server representation of an event log entry."""
    id: UUID = Field(
        default_factory=uuid4,
        description="Unique event ID.",
        json_schema_extra={"example": "99999999-9999-4999-8999-999999999999"},
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="When the event record was created (UTC).",
        json_schema_extra={"example": "2025-10-12T15:10:05Z"},
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "99999999-9999-4999-8999-999999999999",
                    "walk_id": "11111111-1111-4111-8111-111111111111",
                    "timestamp": "2025-10-12T15:10:00Z",
                    "event_type": "photo_uploaded",
                    "message": "Dog resting under shade; uploaded /images/buddy1.jpg",
                    "created_at": "2025-10-12T15:10:05Z",
                }
            ]
        }
    }