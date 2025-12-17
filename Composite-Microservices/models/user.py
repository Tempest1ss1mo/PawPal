"""User and Dog models matching the actual User Service API."""
from __future__ import annotations
from typing import Optional, Any
from pydantic import BaseModel, Field


class User(BaseModel):
    """User model matching User Service response."""
    id: Any = Field(..., description="User ID")
    name: Optional[str] = Field(None, description="User name")
    email: Optional[str] = Field(None, description="User email")
    phone: Optional[str] = Field(None, description="User phone")
    role: Optional[str] = Field(None, description="User role: owner or walker")
    location: Optional[str] = Field(None, description="User location")

    model_config = {"extra": "allow"}


class Dog(BaseModel):
    """Dog model matching User Service response."""
    id: Any = Field(..., description="Dog ID")
    owner_id: Optional[Any] = Field(None, description="Owner ID")
    name: Optional[str] = Field(None, description="Dog name")
    breed: Optional[str] = Field(None, description="Dog breed")
    age: Optional[int] = Field(None, description="Dog age")
    size: Optional[str] = Field(None, description="Dog size")
    temperament: Optional[str] = Field(None, description="Dog temperament")
    special_needs: Optional[str] = Field(None, description="Special needs")
    medical_notes: Optional[str] = Field(None, description="Medical notes")
    profile_image_url: Optional[str] = Field(None, description="Profile image URL")

    model_config = {"extra": "allow"}
