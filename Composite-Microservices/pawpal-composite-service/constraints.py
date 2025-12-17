"""Foreign Key Constraint Validation Logic."""
from typing import Optional
from uuid import UUID
from fastapi import HTTPException

from clients.walk_client import WalkServiceClient
from clients.review_client import ReviewServiceClient
from clients.user_client import UserServiceClient


class ForeignKeyConstraintError(HTTPException):
    """Raised when a foreign key constraint is violated."""
    def __init__(self, detail: str):
        super().__init__(status_code=400, detail=detail)


async def validate_walk_exists(
    walk_client: WalkServiceClient,
    walk_id: UUID,
    error_message: str = "Walk not found - foreign key constraint violation"
) -> None:
    """Validate that a walk exists."""
    walk = await walk_client.get_walk(walk_id)
    if walk is None:
        raise ForeignKeyConstraintError(error_message)


async def validate_user_exists(
    user_client: UserServiceClient,
    user_id: str,
    error_message: str = "User not found - foreign key constraint violation"
) -> None:
    """Validate that a user exists."""
    user = await user_client.get_user(user_id)
    if user is None:
        raise ForeignKeyConstraintError(error_message)


async def validate_review_foreign_keys(
    walk_client: WalkServiceClient,
    user_client: UserServiceClient,
    walk_id: str,
    owner_id: str,
    walker_id: str
) -> None:
    """
    Validate foreign key constraints for a review:
    - walkId must exist in Walk service
    - ownerId must exist in User service
    - walkerId must exist in User service
    """
    # Validate walk exists
    try:
        walk_uuid = UUID(walk_id)
        await validate_walk_exists(
            walk_client,
            walk_uuid,
            f"Walk {walk_id} does not exist. Cannot create review - foreign key constraint violation."
        )
    except ValueError:
        raise ForeignKeyConstraintError(f"Invalid walk ID format: {walk_id}")
    
    # Validate owner exists
    await validate_user_exists(
        user_client,
        owner_id,
        f"Owner {owner_id} does not exist. Cannot create review - foreign key constraint violation."
    )
    
    # Validate walker exists
    await validate_user_exists(
        user_client,
        walker_id,
        f"Walker {walker_id} does not exist. Cannot create review - foreign key constraint violation."
    )

