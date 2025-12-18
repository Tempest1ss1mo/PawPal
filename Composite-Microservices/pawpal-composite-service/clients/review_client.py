"""HTTP Client for Review Service."""
import os
import sys
from pathlib import Path
from typing import List, Optional, Dict, Any
import httpx
from fastapi import HTTPException

# Import models from parent directory (shared, not duplicated)
parent_dir = str(Path(__file__).parent.parent.parent)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from models.review import ReviewCreate, ReviewUpdate, Review

REVIEW_SERVICE_URL = os.getenv("REVIEW_SERVICE_URL", "http://localhost:8001")


class ReviewServiceClient:
    """Client for making HTTP requests to the Review Service."""
    
    def __init__(self, base_url: str = REVIEW_SERVICE_URL):
        self.base_url = base_url.rstrip("/")
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
    
    async def create_review(self, review: ReviewCreate) -> Review:
        """Create a new review."""
        response = await self.client.post(
            f"{self.base_url}/reviews",
            json=review.model_dump(mode='json')
        )
        if response.status_code == 201:
            return Review(**response.json())
        raise HTTPException(status_code=response.status_code, detail=response.text)
    
    async def get_review(self, review_id: str) -> Optional[Review]:
        """Get a review by ID."""
        response = await self.client.get(f"{self.base_url}/reviews/{review_id}")
        if response.status_code == 200:
            return Review(**response.json())
        elif response.status_code == 404:
            return None
        raise HTTPException(status_code=response.status_code, detail=response.text)
    
    async def list_reviews(
        self,
        walkerId: Optional[str] = None,
        ownerId: Optional[str] = None,
        walkId: Optional[str] = None,
        minRating: Optional[float] = None,
        maxRating: Optional[float] = None,
        page: int = 1,
        limit: int = 10
    ) -> Dict[str, Any]:
        """List reviews with optional filters."""
        params = {"page": page, "limit": limit}
        if walkerId:
            params["walkerId"] = walkerId
        if ownerId:
            params["ownerId"] = ownerId
        if walkId:
            params["walkId"] = walkId
        if minRating is not None:
            params["minRating"] = minRating
        if maxRating is not None:
            params["maxRating"] = maxRating
        
        response = await self.client.get(
            f"{self.base_url}/reviews",
            params=params
        )
        if response.status_code == 200:
            return response.json()
        raise HTTPException(status_code=response.status_code, detail=response.text)
    
    async def update_review(self, review_id: str, update: ReviewUpdate) -> Review:
        """Update a review."""
        response = await self.client.patch(
            f"{self.base_url}/reviews/{review_id}",
            json=update.model_dump(mode='json', exclude_unset=True)
        )
        if response.status_code == 200:
            return Review(**response.json())
        raise HTTPException(status_code=response.status_code, detail=response.text)
    
    async def delete_review(self, review_id: str) -> bool:
        """Delete a review."""
        response = await self.client.delete(f"{self.base_url}/reviews/{review_id}")
        if response.status_code == 204:
            return True
        elif response.status_code == 404:
            return False
        raise HTTPException(status_code=response.status_code, detail=response.text)

