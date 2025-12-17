from __future__ import annotations

import os
from datetime import datetime
from typing import Dict, List, Optional
from uuid import UUID

from fastapi import FastAPI, HTTPException, Query

from models.user import UserCreate, UserRead, UserUpdate

port = int(os.environ.get("USER_SERVICE_PORT", 8002))

# -----------------------------------------------------------------------------
# In-memory "database"
# -----------------------------------------------------------------------------
users: Dict[UUID, UserRead] = {}

app = FastAPI(
    title="User Service API",
    description="Atomic microservice for managing users (owners and walkers).",
    version="1.0.0",
)

# -----------------------------------------------------------------------------
# User Endpoints
# -----------------------------------------------------------------------------

@app.post("/users", response_model=UserRead, status_code=201)
def create_user(user: UserCreate):
    """Create a new user."""
    if user.id in users:
        raise HTTPException(status_code=400, detail="User already exists")

    new_user = UserRead(**user.model_dump())
    users[user.id] = new_user
    return new_user


@app.get("/users", response_model=List[UserRead])
def list_users(
    user_type: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
):
    """List users with optional filters."""
    results = list(users.values())
    if user_type:
        results = [u for u in results if u.user_type == user_type]
    if city:
        results = [u for u in results if u.city == city]
    return results


@app.get("/users/{user_id}", response_model=UserRead)
def get_user(user_id: UUID):
    """Get a user by ID."""
    if user_id not in users:
        raise HTTPException(status_code=404, detail="User not found")
    return users[user_id]


@app.patch("/users/{user_id}", response_model=UserRead)
def update_user(user_id: UUID, update: UserUpdate):
    """Update a user."""
    if user_id not in users:
        raise HTTPException(status_code=404, detail="User not found")
    stored = users[user_id].model_dump()
    stored.update(update.model_dump(exclude_unset=True))
    users[user_id] = UserRead(**stored)
    return users[user_id]


@app.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: UUID):
    """Delete a user."""
    if user_id not in users:
        raise HTTPException(status_code=404, detail="User not found")
    del users[user_id]
    return None


# -----------------------------------------------------------------------------
# Root
# -----------------------------------------------------------------------------
@app.get("/")
def root():
    return {"message": "Welcome to the User Service API. See /docs for details."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)


