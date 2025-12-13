"""
Foreign Key Constraint Validation Logic.
This module enforces logical foreign key constraints at the composite service layer.
"""
import sys
from pathlib import Path
from uuid import UUID
from fastapi import HTTPException
# Add current directory to path for imports
current_dir = str(Path(__file__).parent)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from client import AtomicServiceClient


class ForeignKeyConstraintError(HTTPException):
    """Raised when a foreign key constraint is violated."""
    def __init__(self, detail: str):
        super().__init__(status_code=400, detail=detail)


async def validate_walk_exists(
    client: AtomicServiceClient,
    walk_id: UUID,
    error_message: str = "Walk not found - foreign key constraint violation"
) -> None:
    """
    Validate that a walk exists before creating dependent records.
    
    Args:
        client: Atomic service client
        walk_id: UUID of the walk to validate
        error_message: Custom error message
    
    Raises:
        ForeignKeyConstraintError: If walk does not exist
    """
    walk = await client.get_walk(walk_id)
    if walk is None:
        raise ForeignKeyConstraintError(error_message)


async def validate_walk_has_no_dependencies(
    client: AtomicServiceClient,
    walk_id: UUID
) -> tuple[bool, list[str]]:
    """
    Check if a walk has dependent assignments or events.
    
    Args:
        client: Atomic service client
        walk_id: UUID of the walk to check
    
    Returns:
        Tuple of (has_dependencies, list of dependency types found)
    """
    dependencies = []
    
    # Check for assignments
    assignments = await client.list_assignments(walk_id=walk_id)
    if assignments:
        dependencies.append("assignments")
    
    # Check for events
    events = await client.list_events(walk_id=walk_id)
    if events:
        dependencies.append("events")
    
    return len(dependencies) > 0, dependencies


async def validate_assignment_walk_id(
    client: AtomicServiceClient,
    walk_id: UUID
) -> None:
    """Validate that walk_id exists before creating an assignment."""
    await validate_walk_exists(
        client,
        walk_id,
        f"Walk {walk_id} does not exist. Cannot create assignment - foreign key constraint violation."
    )


async def validate_event_walk_id(
    client: AtomicServiceClient,
    walk_id: UUID
) -> None:
    """Validate that walk_id exists before creating an event."""
    await validate_walk_exists(
        client,
        walk_id,
        f"Walk {walk_id} does not exist. Cannot create event - foreign key constraint violation."
    )

