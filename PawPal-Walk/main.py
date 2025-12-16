from __future__ import annotations

import os
import socket
from datetime import datetime
from typing import Dict, List, Optional
from uuid import UUID

from fastapi import FastAPI, HTTPException, Query, Path
from utils.db import get_connection
from utils.pubsub import publish_event

from models.walk import WalkCreate, WalkRead, WalkUpdate
from models.assignment import AssignmentCreate, AssignmentRead, AssignmentUpdate
from models.event import EventCreate, EventRead

port = int(os.environ.get("FASTAPIPORT", 8000))

# -----------------------------------------------------------------------------
# In-memory "databases"
# -----------------------------------------------------------------------------
walks: Dict[UUID, WalkRead] = {}
assignments: Dict[UUID, AssignmentRead] = {}
events: Dict[UUID, EventRead] = {}

app = FastAPI(
    title="Walk Service API",
    description="Microservice for managing dog-walk requests, assignments, and event logs.",
    version="0.2.0",
)

@app.get("/test-db")
def test_db():
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute("SELECT NOW() AS server_time;")
        result = cursor.fetchone()
    conn.close()
    return {"cloud_sql_time": result["server_time"]}

# -----------------------------------------------------------------------------
# Walk Endpoints
# -----------------------------------------------------------------------------

@app.post("/walks", response_model=WalkRead, status_code=201)
def create_walk(walk: WalkCreate):
    if walk.id in walks:
        raise HTTPException(status_code=400, detail="Walk already exists")

    new_walk = WalkRead(**walk.model_dump())
    walks[walk.id] = new_walk

    publish_event("walk_created", new_walk.model_dump())

    return new_walk


@app.get("/walks", response_model=List[WalkRead])
def list_walks(
    owner_id: Optional[UUID] = Query(None),
    city: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
):
    results = list(walks.values())
    if owner_id:
        results = [w for w in results if w.owner_id == owner_id]
    if city:
        results = [w for w in results if w.city == city]
    if status:
        results = [w for w in results if w.status == status]
    return results


@app.get("/walks/{walk_id}", response_model=WalkRead)
def get_walk(walk_id: UUID):
    if walk_id not in walks:
        raise HTTPException(status_code=404, detail="Walk not found")
    return walks[walk_id]


@app.patch("/walks/{walk_id}", response_model=WalkRead)
def update_walk(walk_id: UUID, update: WalkUpdate):
    if walk_id not in walks:
        raise HTTPException(status_code=404, detail="Walk not found")
    stored = walks[walk_id].model_dump()
    stored.update(update.model_dump(exclude_unset=True))
    walks[walk_id] = WalkRead(**stored)
    return walks[walk_id]


@app.delete("/walks/{walk_id}", status_code=204)
def delete_walk(walk_id: UUID):
    if walk_id not in walks:
        raise HTTPException(status_code=404, detail="Walk not found")
    del walks[walk_id]
    return None


# -----------------------------------------------------------------------------
# Assignment Endpoints
# -----------------------------------------------------------------------------
@app.post("/assignments", response_model=AssignmentRead, status_code=201)
def create_assignment(assign: AssignmentCreate):
    if assign.id in assignments:
        raise HTTPException(status_code=400, detail="Assignment already exists")
    assignments[assign.id] = AssignmentRead(**assign.model_dump())
    return assignments[assign.id]


@app.get("/assignments", response_model=List[AssignmentRead])
def list_assignments(
    walker_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
):
    results = list(assignments.values())
    if walker_id:
        results = [a for a in results if a.walker_id == walker_id]
    if status:
        results = [a for a in results if a.status == status]
    return results


@app.get("/assignments/{assignment_id}", response_model=AssignmentRead)
def get_assignment(assignment_id: UUID):
    if assignment_id not in assignments:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return assignments[assignment_id]


@app.patch("/assignments/{assignment_id}", response_model=AssignmentRead)
def update_assignment(assignment_id: UUID, update: AssignmentUpdate):
    if assignment_id not in assignments:
        raise HTTPException(status_code=404, detail="Assignment not found")
    stored = assignments[assignment_id].model_dump()
    stored.update(update.model_dump(exclude_unset=True))
    assignments[assignment_id] = AssignmentRead(**stored)
    return assignments[assignment_id]


@app.delete("/assignments/{assignment_id}", status_code=204)
def delete_assignment(assignment_id: UUID):
    if assignment_id not in assignments:
        raise HTTPException(status_code=404, detail="Assignment not found")
    del assignments[assignment_id]
    return None


# -----------------------------------------------------------------------------
# Event Endpoints
# -----------------------------------------------------------------------------
@app.post("/events", response_model=EventRead, status_code=201)
def create_event(event: EventCreate):
    if event.id in events:
        raise HTTPException(status_code=400, detail="Event already exists")
    events[event.id] = EventRead(**event.model_dump())
    return events[event.id]


@app.get("/events", response_model=List[EventRead])
def list_events(walk_id: Optional[UUID] = Query(None)):
    results = list(events.values())
    if walk_id:
        results = [e for e in results if e.walk_id == walk_id]
    return results


@app.get("/events/{event_id}", response_model=EventRead)
def get_event(event_id: UUID):
    if event_id not in events:
        raise HTTPException(status_code=404, detail="Event not found")
    return events[event_id]


@app.delete("/events/{event_id}", status_code=204)
def delete_event(event_id: UUID):
    if event_id not in events:
        raise HTTPException(status_code=404, detail="Event not found")
    del events[event_id]
    return None


# -----------------------------------------------------------------------------
# Root
# -----------------------------------------------------------------------------
@app.get("/")
def root():
    return {"message": "Welcome to the Walk Service API. See /docs for details."}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)