"""HTTP Client for Walk Service."""
import os
import sys
from pathlib import Path
from typing import List, Optional
from uuid import UUID
import httpx
from fastapi import HTTPException

# Import models from parent directory (shared, not duplicated)
parent_dir = str(Path(__file__).parent.parent.parent)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from models.walk import WalkCreate, WalkRead, WalkUpdate

WALK_SERVICE_URL = os.getenv("WALK_SERVICE_URL", "http://localhost:8000")


class WalkServiceClient:
    """Client for making HTTP requests to the Walk Service."""
    
    def __init__(self, base_url: str = WALK_SERVICE_URL):
        self.base_url = base_url.rstrip("/")
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
    
    async def create_walk(self, walk: WalkCreate) -> WalkRead:
        """Create a new walk."""
        response = await self.client.post(
            f"{self.base_url}/walks",
            json=walk.model_dump()
        )
        if response.status_code == 201:
            return WalkRead(**response.json())
        raise HTTPException(status_code=response.status_code, detail=response.text)
    
    async def get_walk(self, walk_id: UUID) -> Optional[WalkRead]:
        """Get a walk by ID."""
        response = await self.client.get(f"{self.base_url}/walks/{walk_id}")
        if response.status_code == 200:
            return WalkRead(**response.json())
        elif response.status_code == 404:
            return None
        raise HTTPException(status_code=response.status_code, detail=response.text)
    
    async def list_walks(
        self,
        owner_id: Optional[UUID] = None,
        city: Optional[str] = None,
        status: Optional[str] = None
    ) -> List[WalkRead]:
        """List walks with optional filters."""
        params = {}
        if owner_id:
            params["owner_id"] = str(owner_id)
        if city:
            params["city"] = city
        if status:
            params["status"] = status
        
        response = await self.client.get(
            f"{self.base_url}/walks",
            params=params
        )
        if response.status_code == 200:
            return [WalkRead(**item) for item in response.json()]
        raise HTTPException(status_code=response.status_code, detail=response.text)
    
    async def update_walk(self, walk_id: UUID, update: WalkUpdate) -> WalkRead:
        """Update a walk."""
        response = await self.client.patch(
            f"{self.base_url}/walks/{walk_id}",
            json=update.model_dump(exclude_unset=True)
        )
        if response.status_code == 200:
            return WalkRead(**response.json())
        raise HTTPException(status_code=response.status_code, detail=response.text)
    
    async def delete_walk(self, walk_id: UUID) -> bool:
        """Delete a walk."""
        response = await self.client.delete(f"{self.base_url}/walks/{walk_id}")
        if response.status_code == 204:
            return True
        elif response.status_code == 404:
            return False
        raise HTTPException(status_code=response.status_code, detail=response.text)

