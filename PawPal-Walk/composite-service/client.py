"""
HTTP Client for communicating with the atomic Walk Service.
This client encapsulates all calls to the atomic microservice.
"""
import os
import sys
from pathlib import Path
from typing import List, Optional, Dict, Any
from uuid import UUID
import httpx
from fastapi import HTTPException

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from models.walk import WalkCreate, WalkRead, WalkUpdate
from models.assignment import AssignmentCreate, AssignmentRead, AssignmentUpdate
from models.event import EventCreate, EventRead

# Base URL for the atomic service
ATOMIC_SERVICE_URL = os.getenv("ATOMIC_SERVICE_URL", "http://localhost:8000")


class AtomicServiceClient:
    """Client for making HTTP requests to the atomic Walk Service."""
    
    def __init__(self, base_url: str = ATOMIC_SERVICE_URL):
        self.base_url = base_url.rstrip("/")
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
    
    # ==================== Walk Operations ====================
    
    async def create_walk(self, walk: WalkCreate) -> WalkRead:
        """Create a new walk in the atomic service."""
        response = await self.client.post(
            f"{self.base_url}/walks",
            json=walk.model_dump()
        )
        if response.status_code == 201:
            return WalkRead(**response.json())
        raise HTTPException(status_code=response.status_code, detail=response.text)
    
    async def get_walk(self, walk_id: UUID) -> Optional[WalkRead]:
        """Get a walk by ID from the atomic service."""
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
        """Update a walk in the atomic service."""
        response = await self.client.patch(
            f"{self.base_url}/walks/{walk_id}",
            json=update.model_dump(exclude_unset=True)
        )
        if response.status_code == 200:
            return WalkRead(**response.json())
        raise HTTPException(status_code=response.status_code, detail=response.text)
    
    async def delete_walk(self, walk_id: UUID) -> bool:
        """Delete a walk from the atomic service."""
        response = await self.client.delete(f"{self.base_url}/walks/{walk_id}")
        if response.status_code == 204:
            return True
        elif response.status_code == 404:
            return False
        raise HTTPException(status_code=response.status_code, detail=response.text)
    
    # ==================== Assignment Operations ====================
    
    async def create_assignment(self, assignment: AssignmentCreate) -> AssignmentRead:
        """Create a new assignment in the atomic service."""
        response = await self.client.post(
            f"{self.base_url}/assignments",
            json=assignment.model_dump()
        )
        if response.status_code == 201:
            return AssignmentRead(**response.json())
        raise HTTPException(status_code=response.status_code, detail=response.text)
    
    async def get_assignment(self, assignment_id: UUID) -> Optional[AssignmentRead]:
        """Get an assignment by ID from the atomic service."""
        response = await self.client.get(f"{self.base_url}/assignments/{assignment_id}")
        if response.status_code == 200:
            return AssignmentRead(**response.json())
        elif response.status_code == 404:
            return None
        raise HTTPException(status_code=response.status_code, detail=response.text)
    
    async def list_assignments(
        self,
        walk_id: Optional[UUID] = None,
        walker_id: Optional[UUID] = None,
        status: Optional[str] = None
    ) -> List[AssignmentRead]:
        """List assignments with optional filters."""
        params = {}
        if walk_id:
            params["walk_id"] = str(walk_id)
        if walker_id:
            params["walker_id"] = str(walker_id)
        if status:
            params["status"] = status
        
        response = await self.client.get(
            f"{self.base_url}/assignments",
            params=params
        )
        if response.status_code == 200:
            return [AssignmentRead(**item) for item in response.json()]
        raise HTTPException(status_code=response.status_code, detail=response.text)
    
    async def update_assignment(
        self,
        assignment_id: UUID,
        update: AssignmentUpdate
    ) -> AssignmentRead:
        """Update an assignment in the atomic service."""
        response = await self.client.patch(
            f"{self.base_url}/assignments/{assignment_id}",
            json=update.model_dump(exclude_unset=True)
        )
        if response.status_code == 200:
            return AssignmentRead(**response.json())
        raise HTTPException(status_code=response.status_code, detail=response.text)
    
    async def delete_assignment(self, assignment_id: UUID) -> bool:
        """Delete an assignment from the atomic service."""
        response = await self.client.delete(f"{self.base_url}/assignments/{assignment_id}")
        if response.status_code == 204:
            return True
        elif response.status_code == 404:
            return False
        raise HTTPException(status_code=response.status_code, detail=response.text)
    
    # ==================== Event Operations ====================
    
    async def create_event(self, event: EventCreate) -> EventRead:
        """Create a new event in the atomic service."""
        response = await self.client.post(
            f"{self.base_url}/events",
            json=event.model_dump()
        )
        if response.status_code == 201:
            return EventRead(**response.json())
        raise HTTPException(status_code=response.status_code, detail=response.text)
    
    async def get_event(self, event_id: UUID) -> Optional[EventRead]:
        """Get an event by ID from the atomic service."""
        response = await self.client.get(f"{self.base_url}/events/{event_id}")
        if response.status_code == 200:
            return EventRead(**response.json())
        elif response.status_code == 404:
            return None
        raise HTTPException(status_code=response.status_code, detail=response.text)
    
    async def list_events(self, walk_id: Optional[UUID] = None) -> List[EventRead]:
        """List events with optional walk_id filter."""
        params = {}
        if walk_id:
            params["walk_id"] = str(walk_id)
        
        response = await self.client.get(
            f"{self.base_url}/events",
            params=params
        )
        if response.status_code == 200:
            return [EventRead(**item) for item in response.json()]
        raise HTTPException(status_code=response.status_code, detail=response.text)
    
    async def delete_event(self, event_id: UUID) -> bool:
        """Delete an event from the atomic service."""
        response = await self.client.delete(f"{self.base_url}/events/{event_id}")
        if response.status_code == 204:
            return True
        elif response.status_code == 404:
            return False
        raise HTTPException(status_code=response.status_code, detail=response.text)

