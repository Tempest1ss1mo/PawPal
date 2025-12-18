"""HTTP Client for User Service."""
import os
import sys
import re
from pathlib import Path
from typing import List, Optional, Dict, Any
import httpx
from fastapi import HTTPException

# Import models from parent directory (shared, not duplicated)
parent_dir = str(Path(__file__).parent.parent.parent)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from models.user import User, Dog

USER_SERVICE_URL = os.getenv("USER_SERVICE_URL", "http://localhost:3001")


def extract_numeric_id(user_id: str) -> str:
    """
    Extract numeric ID from UUID format.
    UUID format: 00000000-0000-0000-0000-000000000009 -> returns "9"
    If already numeric or different format, returns as-is.
    """
    # Check if it's the padded UUID format: 00000000-0000-0000-0000-XXXXXXXXXXXX
    uuid_pattern = r'^0{8}-0{4}-0{4}-0{4}-0*(\d+)$'
    match = re.match(uuid_pattern, user_id)
    if match:
        return match.group(1)  # Return the numeric part without leading zeros

    # If it's already numeric, return as-is
    if user_id.isdigit():
        return user_id

    # Otherwise return the original (might be a real UUID or other format)
    return user_id


class UserServiceClient:
    """Client for making HTTP requests to the User Service."""
    
    def __init__(self, base_url: str = USER_SERVICE_URL):
        self.base_url = base_url.rstrip("/")
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
    
    async def get_user(self, user_id: str) -> Optional[User]:
        """Get a user by ID."""
        # Convert UUID format to numeric ID for User Service
        numeric_id = extract_numeric_id(user_id)
        response = await self.client.get(f"{self.base_url}/api/users/{numeric_id}")
        if response.status_code == 200:
            data = response.json()
            # User Service wraps response in {"success": true, "data": {...}}
            if isinstance(data, dict) and "data" in data:
                user_data = data["data"]
                if isinstance(user_data, dict):
                    return User(**user_data)
            # Fallback: try direct parsing
            return User(**data)
        elif response.status_code == 404:
            return None
        raise HTTPException(status_code=response.status_code, detail=response.text)
    
    async def list_users(
        self,
        role: Optional[str] = None,
        location: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None
    ) -> Dict[str, Any]:
        """List users with optional filters."""
        params = {}
        if role:
            params["role"] = role
        if location:
            params["location"] = location
        if limit:
            params["limit"] = limit
        if offset:
            params["offset"] = offset
        
        response = await self.client.get(
            f"{self.base_url}/api/users",
            params=params
        )
        if response.status_code == 200:
            return response.json()
        raise HTTPException(status_code=response.status_code, detail=response.text)
    
    async def get_user_dogs(self, user_id: str) -> List[Dog]:
        """Get all dogs for a user."""
        # Convert UUID format to numeric ID for User Service
        numeric_id = extract_numeric_id(user_id)
        response = await self.client.get(f"{self.base_url}/api/users/{numeric_id}/dogs")
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                return [Dog(**dog) for dog in data]
            elif isinstance(data, dict) and "dogs" in data:
                return [Dog(**dog) for dog in data["dogs"]]
            return []
        elif response.status_code == 404:
            return []
        raise HTTPException(status_code=response.status_code, detail=response.text)

