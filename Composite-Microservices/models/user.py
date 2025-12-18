from __future__ import annotations
from typing import Optional, Any, Union
from uuid import UUID, uuid4
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr


class UserBase(BaseModel):
    """Core attributes of a user (owner or walker)."""

    name: Optional[str] = Field(
        default=None,
        description="Full name of the user.",
        json_schema_extra={"example": "John Doe"},
    )
    email: Optional[str] = Field(
        default=None,
        description="Email address of the user.",
        json_schema_extra={"example": "john.doe@example.com"},
    )
    phone: Optional[str] = Field(
        None,
        description="Phone number of the user.",
        json_schema_extra={"example": "+1-555-123-4567"},
    )
    user_type: Optional[str] = Field(
        default="owner",
        description="Type of user: owner, walker, or both.",
        json_schema_extra={"example": "owner"},
    )
    city: Optional[str] = Field(
        None,
        description="City where the user is located.",
        json_schema_extra={"example": "New York"},
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "name": "John Doe",
                    "email": "john.doe@example.com",
                    "phone": "+1-555-123-4567",
                    "user_type": "owner",
                    "city": "New York",
                }
            ]
        }
    }


class UserCreate(UserBase):
    """Payload for creating a new user."""
    id: UUID = Field(
        default_factory=uuid4,
        description="Server-generated user ID.",
        json_schema_extra={"example": "11111111-1111-4111-8111-111111111111"},
    )


class UserUpdate(BaseModel):
    """Partial update for an existing user."""
    name: Optional[str] = Field(None, description="Updated name.")
    email: Optional[EmailStr] = Field(None, description="Updated email.")
    phone: Optional[str] = Field(None, description="Updated phone number.")
    user_type: Optional[str] = Field(None, description="Updated user type.")
    city: Optional[str] = Field(None, description="Updated city.")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"name": "Jane Doe"},
                {"phone": "+1-555-987-6543"},
                {"user_type": "both"},
            ]
        }
    }


class UserRead(UserBase):
    """Server representation returned to clients."""
    # User Service returns integer IDs, not UUIDs
    id: Optional[Union[int, str]] = Field(default=None)
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)
    # Also support camelCase field names from User Service
    createdAt: Optional[datetime] = Field(default=None)
    updatedAt: Optional[datetime] = Field(default=None)

    model_config = {
        "extra": "allow",  # Allow extra fields from User Service
        "json_schema_extra": {
            "examples": [
                {
                    "id": 9,
                    "name": "John Doe",
                    "email": "john.doe@example.com",
                    "phone": "+1-555-123-4567",
                    "user_type": "owner",
                    "city": "New York",
                    "created_at": "2025-10-12T13:00:00Z",
                    "updated_at": "2025-10-12T13:00:00Z",
                }
            ]
        }
    }


# Alias for backward compatibility
User = UserRead


class Dog(BaseModel):
    """Dog model for user's pets."""
    # User Service returns integer IDs, not UUIDs
    id: Optional[Union[int, str]] = Field(default=None, description="Dog ID")
    owner_id: Optional[Union[int, str]] = Field(default=None, description="Owner ID")
    # Also support camelCase field names
    ownerId: Optional[Union[int, str]] = Field(default=None, description="Owner ID (camelCase)")
    name: Optional[str] = Field(default=None, description="Dog name")
    breed: Optional[str] = Field(default=None, description="Dog breed")
    age: Optional[int] = Field(default=None, description="Dog age")
    size: Optional[str] = Field(default=None, description="Dog size")

    model_config = {"extra": "allow"}
