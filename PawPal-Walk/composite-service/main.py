"""
Composite Microservice for Walk Service.
This service encapsulates the atomic Walk Service and adds:
- Foreign key constraint validation
- Orchestrated endpoints
- Parallel execution using threads
"""
from __future__ import annotations

import os
from contextlib import asynccontextmanager
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Optional, Dict, Any
from uuid import UUID

from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.responses import JSONResponse

import sys
from pathlib import Path

# Add current directory and parent directory to path for imports
current_dir = str(Path(__file__).parent)
parent_dir = str(Path(__file__).parent.parent)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Import from local modules
from client import AtomicServiceClient
from constraints import (
    validate_assignment_walk_id,
    validate_event_walk_id,
    validate_walk_has_no_dependencies,
    ForeignKeyConstraintError
)
from models.walk import WalkCreate, WalkRead, WalkUpdate
from models.assignment import AssignmentCreate, AssignmentRead, AssignmentUpdate
from models.event import EventCreate, EventRead

port = int(os.environ.get("COMPOSITE_PORT", 8001))
atomic_service_url = os.getenv("ATOMIC_SERVICE_URL", "http://localhost:8000")

# Global client instance
atomic_client: Optional[AtomicServiceClient] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage the lifecycle of the HTTP client."""
    global atomic_client
    atomic_client = AtomicServiceClient(base_url=atomic_service_url)
    yield
    await atomic_client.close()


app = FastAPI(
    title="Walk Service Composite API",
    description="Composite microservice that orchestrates the atomic Walk Service with foreign key constraints and parallel execution.",
    version="1.0.0",
    lifespan=lifespan
)


def get_client() -> AtomicServiceClient:
    """Dependency to get the atomic service client."""
    if atomic_client is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    return atomic_client


# ============================================================================
# DELEGATED ENDPOINTS - Direct passthrough to atomic service
# ============================================================================

@app.get("/")
def root():
    return {
        "message": "Welcome to the Walk Service Composite API. See /docs for details.",
        "atomic_service_url": atomic_service_url
    }


# ============================================================================
# WALK ENDPOINTS - Delegated with optional FK validation
# ============================================================================

@app.post("/walks", response_model=WalkRead, status_code=201)
async def create_walk(walk: WalkCreate, client: AtomicServiceClient = Depends(get_client)):
    """Create a walk - delegated to atomic service."""
    return await client.create_walk(walk)


@app.get("/walks", response_model=List[WalkRead])
async def list_walks(
    owner_id: Optional[UUID] = Query(None),
    city: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    client: AtomicServiceClient = Depends(get_client)
):
    """List walks - delegated to atomic service."""
    return await client.list_walks(owner_id=owner_id, city=city, status=status)


@app.get("/walks/{walk_id}", response_model=WalkRead)
async def get_walk(walk_id: UUID, client: AtomicServiceClient = Depends(get_client)):
    """Get a walk - delegated to atomic service."""
    walk = await client.get_walk(walk_id)
    if walk is None:
        raise HTTPException(status_code=404, detail="Walk not found")
    return walk


@app.patch("/walks/{walk_id}", response_model=WalkRead)
async def update_walk(
    walk_id: UUID,
    update: WalkUpdate,
    client: AtomicServiceClient = Depends(get_client)
):
    """Update a walk - delegated to atomic service."""
    return await client.update_walk(walk_id, update)


@app.delete("/walks/{walk_id}", status_code=204)
async def delete_walk(walk_id: UUID, client: AtomicServiceClient = Depends(get_client)):
    """Delete a walk - delegated to atomic service."""
    deleted = await client.delete_walk(walk_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Walk not found")
    return None


# ============================================================================
# ASSIGNMENT ENDPOINTS - With FK constraint validation
# ============================================================================

@app.post("/assignments", response_model=AssignmentRead, status_code=201)
async def create_assignment(
    assignment: AssignmentCreate,
    client: AtomicServiceClient = Depends(get_client)
):
    """
    Create an assignment with foreign key constraint validation.
    Validates that walk_id exists before creating the assignment.
    """
    # Foreign key constraint: validate walk_id exists
    await validate_assignment_walk_id(client, assignment.walk_id)
    
    return await client.create_assignment(assignment)


@app.get("/assignments", response_model=List[AssignmentRead])
async def list_assignments(
    walker_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    client: AtomicServiceClient = Depends(get_client)
):
    """List assignments - delegated to atomic service."""
    return await client.list_assignments(walker_id=walker_id, status=status)


@app.get("/assignments/{assignment_id}", response_model=AssignmentRead)
async def get_assignment(
    assignment_id: UUID,
    client: AtomicServiceClient = Depends(get_client)
):
    """Get an assignment - delegated to atomic service."""
    assignment = await client.get_assignment(assignment_id)
    if assignment is None:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return assignment


@app.patch("/assignments/{assignment_id}", response_model=AssignmentRead)
async def update_assignment(
    assignment_id: UUID,
    update: AssignmentUpdate,
    client: AtomicServiceClient = Depends(get_client)
):
    """Update an assignment - delegated to atomic service."""
    return await client.update_assignment(assignment_id, update)


@app.delete("/assignments/{assignment_id}", status_code=204)
async def delete_assignment(
    assignment_id: UUID,
    client: AtomicServiceClient = Depends(get_client)
):
    """Delete an assignment - delegated to atomic service."""
    deleted = await client.delete_assignment(assignment_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return None


# ============================================================================
# EVENT ENDPOINTS - With FK constraint validation
# ============================================================================

@app.post("/events", response_model=EventRead, status_code=201)
async def create_event(
    event: EventCreate,
    client: AtomicServiceClient = Depends(get_client)
):
    """
    Create an event with foreign key constraint validation.
    Validates that walk_id exists before creating the event.
    """
    # Foreign key constraint: validate walk_id exists
    await validate_event_walk_id(client, event.walk_id)
    
    return await client.create_event(event)


@app.get("/events", response_model=List[EventRead])
async def list_events(
    walk_id: Optional[UUID] = Query(None),
    client: AtomicServiceClient = Depends(get_client)
):
    """List events - delegated to atomic service."""
    return await client.list_events(walk_id=walk_id)


@app.get("/events/{event_id}", response_model=EventRead)
async def get_event(event_id: UUID, client: AtomicServiceClient = Depends(get_client)):
    """Get an event - delegated to atomic service."""
    event = await client.get_event(event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@app.delete("/events/{event_id}", status_code=204)
async def delete_event(event_id: UUID, client: AtomicServiceClient = Depends(get_client)):
    """Delete an event - delegated to atomic service."""
    deleted = await client.delete_event(event_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Event not found")
    return None


# ============================================================================
# ORCHESTRATED ENDPOINTS - Composite operations with parallel execution
# ============================================================================

@app.get("/walks/{walk_id}/complete", response_model=Dict[str, Any])
async def get_walk_complete(
    walk_id: UUID,
    client: AtomicServiceClient = Depends(get_client)
):
    """
    Get complete walk information including assignments and events.
    Uses thread-based parallel execution to fetch all data simultaneously.
    
    This demonstrates parallel execution using ThreadPoolExecutor.
    """
    # Validate walk exists first
    walk = await client.get_walk(walk_id)
    if walk is None:
        raise HTTPException(status_code=404, detail="Walk not found")
    
    # Use threads for parallel execution
    def fetch_assignments():
        """Fetch assignments in a thread."""
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(client.list_assignments(walk_id=walk_id))
        finally:
            loop.close()
    
    def fetch_events():
        """Fetch events in a thread."""
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(client.list_events(walk_id=walk_id))
        finally:
            loop.close()
    
    # Execute both operations in parallel using threads
    with ThreadPoolExecutor(max_workers=2) as executor:
        assignments_future = executor.submit(fetch_assignments)
        events_future = executor.submit(fetch_events)
        
        # Wait for both to complete
        assignments = assignments_future.result()
        events = events_future.result()
    
    return {
        "walk": walk.model_dump(),
        "assignments": [a.model_dump() for a in assignments],
        "events": [e.model_dump() for e in events],
        "summary": {
            "assignment_count": len(assignments),
            "event_count": len(events)
        }
    }


@app.post("/walks/{walk_id}/assign", response_model=AssignmentRead, status_code=201)
async def assign_walker_to_walk(
    walk_id: UUID,
    walker_id: UUID,
    client: AtomicServiceClient = Depends(get_client)
):
    """
    Orchestrated endpoint: Assign a walker to a walk.
    Enforces foreign key constraint (walk must exist).
    """
    # Foreign key constraint validation
    await validate_assignment_walk_id(client, walk_id)
    
    # Create assignment
    assignment = AssignmentCreate(
        walk_id=walk_id,
        walker_id=walker_id,
        status="pending"
    )
    
    return await client.create_assignment(assignment)


@app.post("/walks/{walk_id}/events", response_model=EventRead, status_code=201)
async def create_walk_event(
    walk_id: UUID,
    event_type: str,
    message: Optional[str] = None,
    client: AtomicServiceClient = Depends(get_client)
):
    """
    Orchestrated endpoint: Create an event for a walk.
    Enforces foreign key constraint (walk must exist).
    """
    # Foreign key constraint validation
    await validate_event_walk_id(client, walk_id)
    
    # Create event
    event = EventCreate(
        walk_id=walk_id,
        event_type=event_type,
        message=message
    )
    
    return await client.create_event(event)


@app.delete("/walks/{walk_id}/cascade", status_code=200)
async def delete_walk_cascade(
    walk_id: UUID,
    force: bool = Query(False, description="Force delete even if dependencies exist"),
    client: AtomicServiceClient = Depends(get_client)
):
    """
    Orchestrated endpoint: Delete a walk and all related data (cascade delete).
    Uses parallel execution to delete assignments and events simultaneously.
    
    Enforces foreign key constraint: warns if dependencies exist unless force=true.
    """
    # Check if walk exists
    walk = await client.get_walk(walk_id)
    if walk is None:
        raise HTTPException(status_code=404, detail="Walk not found")
    
    # Check for dependencies
    has_deps, dep_types = await validate_walk_has_no_dependencies(client, walk_id)
    
    if has_deps and not force:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete walk {walk_id}: has dependencies ({', '.join(dep_types)}). Use force=true to delete anyway."
        )
    
    # Fetch all related data
    assignments = await client.list_assignments(walk_id=walk_id)
    events = await client.list_events(walk_id=walk_id)
    
    # Delete related data in parallel using threads
    def delete_assignment(assignment_id: UUID):
        """Delete an assignment in a thread."""
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(client.delete_assignment(assignment_id))
        finally:
            loop.close()
    
    def delete_event(event_id: UUID):
        """Delete an event in a thread."""
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(client.delete_event(event_id))
        finally:
            loop.close()
    
    # Parallel deletion of assignments and events
    deleted_count = 0
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = []
        
        # Submit all deletion tasks
        for assignment in assignments:
            futures.append(executor.submit(delete_assignment, assignment.id))
        for event in events:
            futures.append(executor.submit(delete_event, event.id))
        
        # Wait for all deletions to complete
        for future in as_completed(futures):
            if future.result():
                deleted_count += 1
    
    # Finally delete the walk
    await client.delete_walk(walk_id)
    
    return {
        "message": f"Walk {walk_id} and {deleted_count} related records deleted successfully",
        "deleted": {
            "walk": walk_id,
            "assignments": len(assignments),
            "events": len(events)
        }
    }


# ============================================================================
# Error Handlers
# ============================================================================

@app.exception_handler(ForeignKeyConstraintError)
async def foreign_key_constraint_handler(request, exc: ForeignKeyConstraintError):
    """Handle foreign key constraint violations."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": "Foreign Key Constraint Violation", "detail": exc.detail}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

