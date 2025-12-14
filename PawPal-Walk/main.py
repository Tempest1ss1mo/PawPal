from __future__ import annotations

import os
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import FastAPI, HTTPException, Query
from utils.db import get_connection
from utils.pubsub import publish_event

from models.walk import WalkCreate, WalkRead, WalkUpdate
from models.assignment import AssignmentCreate, AssignmentRead, AssignmentUpdate
from models.event import EventCreate, EventRead

port = int(os.environ.get("FASTAPIPORT", 8000))

app = FastAPI(
    title="Walk Service API",
    description="Microservice for managing dog-walk requests, assignments, and event logs.",
    version="0.3.0",
)


# -----------------------------------------------------------------------------
# Helper functions to convert database rows to Pydantic models
# -----------------------------------------------------------------------------
def row_to_walk(row: dict) -> WalkRead:
    return WalkRead(
        id=UUID(row["id"]),
        owner_id=UUID(row["owner_id"]),
        pet_id=UUID(row["pet_id"]),
        location=row["location"],
        city=row["city"],
        scheduled_time=row["scheduled_time"],
        duration_minutes=row["duration_minutes"],
        status=row["status"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def row_to_assignment(row: dict) -> AssignmentRead:
    return AssignmentRead(
        id=UUID(row["id"]),
        walk_id=UUID(row["walk_id"]),
        walker_id=UUID(row["walker_id"]),
        start_time=row["start_time"],
        end_time=row["end_time"],
        status=row["status"],
        notes=row["notes"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def row_to_event(row: dict) -> EventRead:
    return EventRead(
        id=UUID(row["id"]),
        walk_id=UUID(row["walk_id"]),
        timestamp=row["timestamp"],
        event_type=row["event_type"],
        message=row["message"],
        created_at=row["created_at"],
    )


# -----------------------------------------------------------------------------
# Database Test Endpoint
# -----------------------------------------------------------------------------
@app.get("/test-db")
def test_db():
    try:
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT NOW() AS server_time;")
            result = cursor.fetchone()
        conn.close()
        return {"status": "connected", "cloud_sql_time": result["server_time"]}
    except Exception as e:
        return {"status": "disconnected", "error": str(e)}


# -----------------------------------------------------------------------------
# Walk Endpoints
# -----------------------------------------------------------------------------
@app.post("/walks", response_model=WalkRead, status_code=201)
def create_walk(walk: WalkCreate):
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            # Check if walk already exists
            cursor.execute("SELECT id FROM walks WHERE id = %s", (str(walk.id),))
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Walk already exists")

            now = datetime.utcnow()
            cursor.execute(
                """
                INSERT INTO walks (id, owner_id, pet_id, location, city, scheduled_time,
                                   duration_minutes, status, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    str(walk.id),
                    str(walk.owner_id),
                    str(walk.pet_id),
                    walk.location,
                    walk.city,
                    walk.scheduled_time,
                    walk.duration_minutes,
                    walk.status,
                    now,
                    now,
                ),
            )
            conn.commit()

            new_walk = WalkRead(
                id=walk.id,
                owner_id=walk.owner_id,
                pet_id=walk.pet_id,
                location=walk.location,
                city=walk.city,
                scheduled_time=walk.scheduled_time,
                duration_minutes=walk.duration_minutes,
                status=walk.status,
                created_at=now,
                updated_at=now,
            )
            publish_event("walk_created", new_walk.model_dump())
            return new_walk
    finally:
        conn.close()


@app.get("/walks", response_model=List[WalkRead])
def list_walks(
    owner_id: Optional[UUID] = Query(None),
    city: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
):
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            sql = "SELECT * FROM walks WHERE 1=1"
            params = []

            if owner_id:
                sql += " AND owner_id = %s"
                params.append(str(owner_id))
            if city:
                sql += " AND city = %s"
                params.append(city)
            if status:
                sql += " AND status = %s"
                params.append(status)

            sql += " ORDER BY created_at DESC"
            cursor.execute(sql, params)
            rows = cursor.fetchall()

            return [row_to_walk(row) for row in rows]
    finally:
        conn.close()


@app.get("/walks/{walk_id}", response_model=WalkRead)
def get_walk(walk_id: UUID):
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM walks WHERE id = %s", (str(walk_id),))
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Walk not found")
            return row_to_walk(row)
    finally:
        conn.close()


@app.patch("/walks/{walk_id}", response_model=WalkRead)
def update_walk(walk_id: UUID, update: WalkUpdate):
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM walks WHERE id = %s", (str(walk_id),))
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Walk not found")

            update_data = update.model_dump(exclude_unset=True)
            if not update_data:
                return row_to_walk(row)

            set_clauses = []
            params = []
            for key, value in update_data.items():
                set_clauses.append(f"{key} = %s")
                params.append(value)

            set_clauses.append("updated_at = %s")
            params.append(datetime.utcnow())
            params.append(str(walk_id))

            sql = f"UPDATE walks SET {', '.join(set_clauses)} WHERE id = %s"
            cursor.execute(sql, params)
            conn.commit()

            cursor.execute("SELECT * FROM walks WHERE id = %s", (str(walk_id),))
            return row_to_walk(cursor.fetchone())
    finally:
        conn.close()


@app.delete("/walks/{walk_id}", status_code=204)
def delete_walk(walk_id: UUID):
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id FROM walks WHERE id = %s", (str(walk_id),))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Walk not found")

            cursor.execute("DELETE FROM walks WHERE id = %s", (str(walk_id),))
            conn.commit()
            return None
    finally:
        conn.close()


# -----------------------------------------------------------------------------
# Assignment Endpoints
# -----------------------------------------------------------------------------
@app.post("/assignments", response_model=AssignmentRead, status_code=201)
def create_assignment(assign: AssignmentCreate):
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id FROM assignments WHERE id = %s", (str(assign.id),)
            )
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Assignment already exists")

            now = datetime.utcnow()
            cursor.execute(
                """
                INSERT INTO assignments (id, walk_id, walker_id, start_time, end_time,
                                         status, notes, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    str(assign.id),
                    str(assign.walk_id),
                    str(assign.walker_id),
                    assign.start_time,
                    assign.end_time,
                    assign.status,
                    assign.notes,
                    now,
                    now,
                ),
            )
            conn.commit()

            return AssignmentRead(
                id=assign.id,
                walk_id=assign.walk_id,
                walker_id=assign.walker_id,
                start_time=assign.start_time,
                end_time=assign.end_time,
                status=assign.status,
                notes=assign.notes,
                created_at=now,
                updated_at=now,
            )
    finally:
        conn.close()


@app.get("/assignments", response_model=List[AssignmentRead])
def list_assignments(
    walker_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
):
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            sql = "SELECT * FROM assignments WHERE 1=1"
            params = []

            if walker_id:
                sql += " AND walker_id = %s"
                params.append(str(walker_id))
            if status:
                sql += " AND status = %s"
                params.append(status)

            sql += " ORDER BY created_at DESC"
            cursor.execute(sql, params)
            rows = cursor.fetchall()

            return [row_to_assignment(row) for row in rows]
    finally:
        conn.close()


@app.get("/assignments/{assignment_id}", response_model=AssignmentRead)
def get_assignment(assignment_id: UUID):
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT * FROM assignments WHERE id = %s", (str(assignment_id),)
            )
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Assignment not found")
            return row_to_assignment(row)
    finally:
        conn.close()


@app.patch("/assignments/{assignment_id}", response_model=AssignmentRead)
def update_assignment(assignment_id: UUID, update: AssignmentUpdate):
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT * FROM assignments WHERE id = %s", (str(assignment_id),)
            )
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Assignment not found")

            update_data = update.model_dump(exclude_unset=True)
            if not update_data:
                return row_to_assignment(row)

            set_clauses = []
            params = []
            for key, value in update_data.items():
                set_clauses.append(f"{key} = %s")
                if isinstance(value, datetime):
                    params.append(value)
                else:
                    params.append(value)

            set_clauses.append("updated_at = %s")
            params.append(datetime.utcnow())
            params.append(str(assignment_id))

            sql = f"UPDATE assignments SET {', '.join(set_clauses)} WHERE id = %s"
            cursor.execute(sql, params)
            conn.commit()

            cursor.execute(
                "SELECT * FROM assignments WHERE id = %s", (str(assignment_id),)
            )
            return row_to_assignment(cursor.fetchone())
    finally:
        conn.close()


@app.delete("/assignments/{assignment_id}", status_code=204)
def delete_assignment(assignment_id: UUID):
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id FROM assignments WHERE id = %s", (str(assignment_id),)
            )
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Assignment not found")

            cursor.execute(
                "DELETE FROM assignments WHERE id = %s", (str(assignment_id),)
            )
            conn.commit()
            return None
    finally:
        conn.close()


# -----------------------------------------------------------------------------
# Event Endpoints
# -----------------------------------------------------------------------------
@app.post("/events", response_model=EventRead, status_code=201)
def create_event(event: EventCreate):
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id FROM events WHERE id = %s", (str(event.id),))
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Event already exists")

            now = datetime.utcnow()
            cursor.execute(
                """
                INSERT INTO events (id, walk_id, timestamp, event_type, message, created_at)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    str(event.id),
                    str(event.walk_id),
                    event.timestamp,
                    event.event_type,
                    event.message,
                    now,
                ),
            )
            conn.commit()

            return EventRead(
                id=event.id,
                walk_id=event.walk_id,
                timestamp=event.timestamp,
                event_type=event.event_type,
                message=event.message,
                created_at=now,
            )
    finally:
        conn.close()


@app.get("/events", response_model=List[EventRead])
def list_events(walk_id: Optional[UUID] = Query(None)):
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            if walk_id:
                cursor.execute(
                    "SELECT * FROM events WHERE walk_id = %s ORDER BY created_at DESC",
                    (str(walk_id),),
                )
            else:
                cursor.execute("SELECT * FROM events ORDER BY created_at DESC")
            rows = cursor.fetchall()

            return [row_to_event(row) for row in rows]
    finally:
        conn.close()


@app.get("/events/{event_id}", response_model=EventRead)
def get_event(event_id: UUID):
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM events WHERE id = %s", (str(event_id),))
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Event not found")
            return row_to_event(row)
    finally:
        conn.close()


@app.delete("/events/{event_id}", status_code=204)
def delete_event(event_id: UUID):
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id FROM events WHERE id = %s", (str(event_id),))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Event not found")

            cursor.execute("DELETE FROM events WHERE id = %s", (str(event_id),))
            conn.commit()
            return None
    finally:
        conn.close()


# -----------------------------------------------------------------------------
# Root & Health Check
# -----------------------------------------------------------------------------
@app.get("/")
def root():
    return {"message": "Welcome to the Walk Service API. See /docs for details."}


@app.get("/health")
def health():
    try:
        conn = get_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT 1")
        conn.close()
        return {"service": "PawPal Walk Service", "status": "healthy", "database": "connected"}
    except Exception as e:
        return {"service": "PawPal Walk Service", "status": "degraded", "database": "disconnected"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
