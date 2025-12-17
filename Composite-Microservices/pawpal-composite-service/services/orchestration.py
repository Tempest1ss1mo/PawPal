"""
Orchestration service layer.
Handles parallel execution and composite operations.
Separates business logic from HTTP handlers.
"""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Any, Optional
from uuid import UUID
import asyncio
import sys
from pathlib import Path

# Add parent directories to path for imports
current_dir = str(Path(__file__).parent.parent)
parent_dir = str(Path(__file__).parent.parent.parent)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from clients.walk_client import WalkServiceClient
from clients.review_client import ReviewServiceClient
from clients.user_client import UserServiceClient


class OrchestrationService:
    """Service layer for composite operations with parallel execution."""
    
    def __init__(
        self,
        walk_client: WalkServiceClient,
        review_client: ReviewServiceClient,
        user_client: UserServiceClient
    ):
        self.walk_client = walk_client
        self.review_client = review_client
        self.user_client = user_client
    
    async def get_walk_with_reviews(self, walk_id: UUID) -> Optional[Dict[str, Any]]:
        """
        Get walk with its reviews using parallel execution.
        
        This demonstrates thread-based parallel execution as required.
        """
        # Fetch walk first (required for validation)
        walk = await self.walk_client.get_walk(walk_id)
        if walk is None:
            return None
        
        # Parallel execution: fetch reviews in a separate thread
        def fetch_reviews():
            """Fetch reviews in a thread."""
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                return loop.run_until_complete(
                    self.review_client.list_reviews(walkId=str(walk_id))
                )
            finally:
                loop.close()
        
        # Execute review fetch in parallel using threads
        with ThreadPoolExecutor(max_workers=1) as executor:
            reviews_future = executor.submit(fetch_reviews)
            reviews_data = reviews_future.result()
        
        reviews = reviews_data.get("data", []) if isinstance(reviews_data, dict) else reviews_data
        
        return {
            "walk": walk.model_dump() if hasattr(walk, 'model_dump') else walk,
            "reviews": reviews if isinstance(reviews, list) else [],
            "summary": {
                "review_count": len(reviews) if isinstance(reviews, list) else 0
            }
        }
    
    async def get_user_complete(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get user with dogs and reviews using parallel execution.
        
        Uses 3 threads to fetch user, dogs, and reviews in parallel.
        """
        def fetch_user():
            """Fetch user in a thread."""
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                return loop.run_until_complete(self.user_client.get_user(user_id))
            finally:
                loop.close()
        
        def fetch_dogs():
            """Fetch dogs in a thread."""
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                return loop.run_until_complete(self.user_client.get_user_dogs(user_id))
            finally:
                loop.close()
        
        def fetch_reviews():
            """Fetch reviews in a thread."""
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                # Fetch reviews where user is owner or walker
                owner_reviews = loop.run_until_complete(
                    self.review_client.list_reviews(ownerId=user_id)
                )
                walker_reviews = loop.run_until_complete(
                    self.review_client.list_reviews(walkerId=user_id)
                )
                return {
                    "as_owner": owner_reviews.get("data", []) if isinstance(owner_reviews, dict) else owner_reviews,
                    "as_walker": walker_reviews.get("data", []) if isinstance(walker_reviews, dict) else walker_reviews
                }
            finally:
                loop.close()
        
        # Execute all three operations in parallel using threads
        with ThreadPoolExecutor(max_workers=3) as executor:
            user_future = executor.submit(fetch_user)
            dogs_future = executor.submit(fetch_dogs)
            reviews_future = executor.submit(fetch_reviews)
            
            user = user_future.result()
            dogs = dogs_future.result()
            reviews = reviews_future.result()
        
        if user is None:
            return None
        
        return {
            "user": user.model_dump() if hasattr(user, 'model_dump') else user,
            "dogs": [dog.model_dump() if hasattr(dog, 'model_dump') else dog for dog in dogs] if isinstance(dogs, list) else [],
            "reviews": reviews,
            "summary": {
                "dog_count": len(dogs) if isinstance(dogs, list) else 0,
                "review_count": len(reviews.get("as_owner", [])) + len(reviews.get("as_walker", []))
            }
        }
