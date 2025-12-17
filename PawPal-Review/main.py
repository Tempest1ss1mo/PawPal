from fastapi import FastAPI, HTTPException, Header, Response, Request, status
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
import asyncio
from enum import Enum
import json

from utils import generate_etag
from database import mysql_pool


app = FastAPI(
    title="PawPal Review Service",
    description="Microservice for managing reviews and ratings in PawPal dog-walking coordination system.",
)


class ReviewCreate(BaseModel):
    walkId: str
    ownerId: str
    walkerId: str
    rating: float = Field(..., ge=1.0, le=5.0)
    comment: Optional[str] = None


class ReviewUpdate(BaseModel):
    rating: Optional[float] = Field(None, ge=1.0, le=5.0)
    comment: Optional[str] = None


class Review(BaseModel):
    id: str
    walkId: str
    ownerId: str
    walkerId: str
    rating: float = Field(..., ge=1.0, le=5.0)
    comment: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime
    links: Optional[Dict[str, str]] = None


class PaginatedReviews(BaseModel):
    data: List[Review]
    pagination: Dict[str, Any]
    links: Dict[str, Optional[str]]


class JobStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class AnalyticsJobResponse(BaseModel):
    jobId: str
    status: JobStatus
    message: str
    links: Dict[str, str]
    result: Optional[str] = ""


class PaginatedJobs(BaseModel):
    data: List[AnalyticsJobResponse]
    pagination: Dict[str, Any]
    links: Dict[str, Optional[str]]


def row_to_review(row: dict) -> dict:
    return {
        "id": row["id"],
        "walkId": row["walk_id"],
        "ownerId": row["owner_id"],
        "walkerId": row["walker_id"],
        "rating": float(row["rating"]),
        "comment": row["comment"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def row_to_job(row: dict) -> dict:
    return {
        "jobId": row["id"],
        "status": row["status"],
        "createdAt": row["created_at"],
        "completedAt": row.get("completed_at"),
        "result": row.get("result") or "",
    }


def add_review_links(review: dict, request: Request) -> dict:
    base_url = str(request.base_url).rstrip("/")
    review_copy = review.copy()
    review_copy["links"] = {
        "self": f"{base_url}/reviews/{review['id']}",
        "walker": f"{base_url}/walkers/{review['walkerId']}",
        "owner": f"{base_url}/owners/{review['ownerId']}",
        "walk": f"{base_url}/walks/{review['walkId']}",
    }
    return review_copy


async def process_analytics_job(job_id: str):
    await asyncio.sleep(1)

    try:
        result = mysql_pool.fetchone(
            "SELECT COUNT(*) as total, AVG(rating) as avg_rating FROM reviews"
        )

        total = result["total"] if result else 0
        avg_rating = (
            float(result["avg_rating"]) if result and result["avg_rating"] else 0
        )

        mysql_pool.execute(
            """
            UPDATE analytics_jobs 
            SET status = %s, completed_at = %s, result = %s
            WHERE id = %s
            """,
            (
                JobStatus.completed,
                datetime.utcnow(),
                json.dumps(
                    {
                        "totalReviews": total,
                        "averageRating": round(avg_rating, 2),
                        "completedAt": datetime.utcnow().isoformat(),
                    }
                ),
                job_id,
            ),
        )
    except Exception as e:
        print(f"Error processing analytics job {job_id}: {e}")
        try:
            mysql_pool.execute(
                "UPDATE analytics_jobs SET status = %s WHERE id = %s",
                (JobStatus.failed, job_id),
            )
        except Exception as update_error:
            print(f"Error updating job status to failed: {update_error}")


@app.get("/")
async def root():
    try:
        mysql_pool.fetchone("SELECT 1")
        db_healthy = True
    except Exception:
        db_healthy = False

    return {
        "service": "PawPal Review Service",
        "status": "healthy" if db_healthy else "degraded",
        "database": "connected" if db_healthy else "disconnected",
    }


@app.get("/health")
async def health_check():
    try:
        mysql_pool.fetchone("SELECT 1")
    except Exception:
        raise HTTPException(status_code=503, detail="Database connection failed")
    return {"status": "healthy", "database": "connected"}


@app.get("/reviews", response_model=PaginatedReviews)
async def list_reviews(
    request: Request,
    response: Response,
    walkerId: Optional[str] = None,
    ownerId: Optional[str] = None,
    minRating: Optional[float] = None,
    maxRating: Optional[float] = None,
    page: int = 1,
    limit: int = 10,
    if_none_match: Optional[str] = Header(None),
):
    """
    List all reviews with pagination, query parameters, and ETag support
    """
    where_clauses = []
    params = []

    if walkerId:
        where_clauses.append("walker_id = %s")
        params.append(walkerId)

    if ownerId:
        where_clauses.append("owner_id = %s")
        params.append(ownerId)

    if minRating is not None:
        where_clauses.append("rating >= %s")
        params.append(minRating)

    if maxRating is not None:
        where_clauses.append("rating <= %s")
        params.append(maxRating)

    where_sql = " WHERE " + " AND ".join(where_clauses) if where_clauses else ""

    count_query = f"SELECT COUNT(*) as total FROM reviews{where_sql}"
    count_result = mysql_pool.fetchone(count_query, tuple(params) if params else None)
    total = count_result["total"]

    total_pages = (total + limit - 1) // limit if limit > 0 else 1
    page = max(1, page)
    offset = (page - 1) * limit

    query = f"""
        SELECT * FROM reviews
        {where_sql}
        ORDER BY created_at DESC
        LIMIT %s OFFSET %s
    """
    rows = mysql_pool.fetchall(query, tuple(params + [limit, offset]))

    reviews = [row_to_review(row) for row in rows]
    reviews_with_links = [add_review_links(r, request) for r in reviews]

    base_url = str(request.base_url).rstrip("/")
    query_params = []
    if walkerId:
        query_params.append(f"walkerId={walkerId}")
    if ownerId:
        query_params.append(f"ownerId={ownerId}")
    if minRating is not None:
        query_params.append(f"minRating={minRating}")
    if maxRating is not None:
        query_params.append(f"maxRating={maxRating}")
    query_params.append(f"limit={limit}")

    query_string = "&" + "&".join(query_params) if query_params else ""

    links = {
        "self": f"{base_url}/reviews?page={page}{query_string}",
        "first": f"{base_url}/reviews?page=1{query_string}",
        "last": f"{base_url}/reviews?page={total_pages}{query_string}",
        "next": f"{base_url}/reviews?page={page + 1}{query_string}"
        if page < total_pages
        else None,
        "prev": f"{base_url}/reviews?page={page - 1}{query_string}"
        if page > 1
        else None,
    }

    result_data = PaginatedReviews(
        data=reviews_with_links,
        pagination={
            "page": page,
            "limit": limit,
            "total": total,
            "totalPages": total_pages,
        },
        links=links,
    )

    collection_etag = generate_etag(
        {
            "data": reviews,
            "page": page,
            "filters": {
                "walkerId": walkerId,
                "ownerId": ownerId,
                "minRating": minRating,
                "maxRating": maxRating,
            },
        }
    )

    if if_none_match and if_none_match == f'"{collection_etag}"':
        raise HTTPException(status_code=304, detail="Not Modified")

    response.headers["ETag"] = f'"{collection_etag}"'

    return result_data


@app.post("/reviews", response_model=Review, status_code=status.HTTP_201_CREATED)
async def create_review(review: ReviewCreate, request: Request, response: Response):
    """
    Create a new review - Returns 201 Created
    """
    review_id = str(uuid.uuid4())
    now = datetime.utcnow()

    mysql_pool.execute(
        """
        INSERT INTO reviews (id, walk_id, owner_id, walker_id, rating, comment, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            review_id,
            review.walkId,
            review.ownerId,
            review.walkerId,
            review.rating,
            review.comment,
            now,
            now,
        ),
    )

    row = mysql_pool.fetchone("SELECT * FROM reviews WHERE id = %s", (review_id,))
    review_data = row_to_review(row)

    base_url = str(request.base_url).rstrip("/")
    location = f"{base_url}/reviews/{review_id}"
    response.headers["Location"] = location

    review_with_links = add_review_links(review_data, request)

    return review_with_links


@app.get("/reviews/{reviewId}", response_model=Review)
async def get_review(
    reviewId: str,
    request: Request,
    response: Response,
    if_none_match: Optional[str] = Header(None),
):
    """
    Get a review by ID with ETag support
    """
    row = mysql_pool.fetchone("SELECT * FROM reviews WHERE id = %s", (reviewId,))

    if not row:
        raise HTTPException(status_code=404, detail="Review not found")

    review_data = row_to_review(row)

    etag = generate_etag(review_data)

    if if_none_match and if_none_match == f'"{etag}"':
        raise HTTPException(status_code=304, detail="Not Modified")

    response.headers["ETag"] = f'"{etag}"'

    review_with_links = add_review_links(review_data, request)

    return review_with_links


@app.patch("/reviews/{reviewId}", response_model=Review)
async def update_review(
    reviewId: str,
    review_update: ReviewUpdate,
    request: Request,
    response: Response,
    if_match: Optional[str] = Header(None),
):
    """
    Update an existing review
    """
    row = mysql_pool.fetchone("SELECT * FROM reviews WHERE id = %s", (reviewId,))

    if not row:
        raise HTTPException(status_code=404, detail="Review not found")

    review_data = row_to_review(row)
    current_etag = generate_etag(review_data)

    if if_match and if_match != f'"{current_etag}"':
        raise HTTPException(
            status_code=412,
            detail="Precondition Failed - Resource has been modified",
        )

    update_fields = []
    params = []

    if review_update.rating is not None:
        update_fields.append("rating = %s")
        params.append(review_update.rating)

    if review_update.comment is not None:
        update_fields.append("comment = %s")
        params.append(review_update.comment)

    if not update_fields:
        review_with_links = add_review_links(review_data, request)
        response.headers["ETag"] = f'"{current_etag}"'
        return review_with_links

    update_fields.append("updated_at = %s")
    params.append(datetime.utcnow())

    params.append(reviewId)

    update_query = f"""
        UPDATE reviews
        SET {", ".join(update_fields)}
        WHERE id = %s
    """
    mysql_pool.execute(update_query, tuple(params))

    updated_row = mysql_pool.fetchone(
        "SELECT * FROM reviews WHERE id = %s", (reviewId,)
    )
    updated_review_data = row_to_review(updated_row)

    new_etag = generate_etag(updated_review_data)
    response.headers["ETag"] = f'"{new_etag}"'

    review_with_links = add_review_links(updated_review_data, request)

    return review_with_links


@app.delete("/reviews/{reviewId}", status_code=204)
async def delete_review(reviewId: str):
    """
    Delete a review
    """
    existing = mysql_pool.fetchone("SELECT id FROM reviews WHERE id = %s", (reviewId,))

    if not existing:
        raise HTTPException(status_code=404, detail="Review not found")

    mysql_pool.execute("DELETE FROM reviews WHERE id = %s", (reviewId,))

    return Response(status_code=204)


@app.post(
    "/analytics/generate",
    response_model=AnalyticsJobResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def generate_analytics(request: Request, response: Response):
    """
    Generate analytics report (Asynchronous) - Returns 202 Accepted
    """
    job_id = str(uuid.uuid4())

    mysql_pool.execute(
        """
        INSERT INTO analytics_jobs (id, status, created_at)
        VALUES (%s, %s, %s)
        """,
        (job_id, JobStatus.processing, datetime.utcnow()),
    )

    asyncio.create_task(process_analytics_job(job_id))

    base_url = str(request.base_url).rstrip("/")

    job_response = AnalyticsJobResponse(
        jobId=job_id,
        status=JobStatus.processing,
        message="Analytics generation in progress",
        links={
            "self": f"{base_url}/analytics/jobs/{job_id}",
            "status": f"{base_url}/analytics/jobs/{job_id}/status",
        },
    )

    response.headers["Location"] = f"{base_url}/analytics/jobs/{job_id}"

    return job_response


@app.get("/analytics/jobs", response_model=PaginatedJobs)
async def list_analytics_jobs(
    request: Request,
    response: Response,
    status_filter: Optional[JobStatus] = None,
    page: int = 1,
    limit: int = 10,
    if_none_match: Optional[str] = Header(None),
):
    """
    List all analytics jobs with pagination and query parameters
    """
    where_sql = ""
    params = []

    if status_filter:
        where_sql = " WHERE status = %s"
        params.append(status_filter)

    count_query = f"SELECT COUNT(*) as total FROM analytics_jobs{where_sql}"
    count_result = mysql_pool.fetchone(count_query, tuple(params) if params else None)
    total = count_result["total"]

    total_pages = (total + limit - 1) // limit if limit > 0 else 1
    page = max(1, page)
    offset = (page - 1) * limit

    query = f"""
        SELECT * FROM analytics_jobs
        {where_sql}
        ORDER BY created_at DESC
        LIMIT %s OFFSET %s
    """
    rows = mysql_pool.fetchall(query, tuple(params + [limit, offset]))

    jobs = [row_to_job(row) for row in rows]

    base_url = str(request.base_url).rstrip("/")
    jobs_with_links = [
        AnalyticsJobResponse(
            jobId=job["jobId"],
            status=job["status"],
            message=f"Job is {job['status']}",
            links={
                "self": f"{base_url}/analytics/jobs/{job['jobId']}",
                "status": f"{base_url}/analytics/jobs/{job['jobId']}/status",
            },
            result=job.get("result") or "",
        )
        for job in jobs
    ]

    query_params = []
    if status_filter:
        query_params.append(f"status_filter={status_filter}")
    query_params.append(f"limit={limit}")

    query_string = "&" + "&".join(query_params) if query_params else ""

    links = {
        "self": f"{base_url}/analytics/jobs?page={page}{query_string}",
        "first": f"{base_url}/analytics/jobs?page=1{query_string}",
        "last": f"{base_url}/analytics/jobs?page={total_pages}{query_string}",
        "next": f"{base_url}/analytics/jobs?page={page + 1}{query_string}"
        if page < total_pages
        else None,
        "prev": f"{base_url}/analytics/jobs?page={page - 1}{query_string}"
        if page > 1
        else None,
    }

    result_data = PaginatedJobs(
        data=jobs_with_links,
        pagination={
            "page": page,
            "limit": limit,
            "total": total,
            "totalPages": total_pages,
        },
        links=links,
    )

    collection_etag = generate_etag(
        {
            "data": jobs,
            "page": page,
            "filter": {"status": status_filter.value if status_filter else None},
        }
    )

    if if_none_match and if_none_match == f'"{collection_etag}"':
        raise HTTPException(status_code=304, detail="Not Modified")

    response.headers["ETag"] = f'"{collection_etag}"'

    return result_data


@app.get("/analytics/jobs/{jobId}", response_model=AnalyticsJobResponse)
async def get_analytics_job(
    jobId: str,
    request: Request,
    response: Response,
    if_none_match: Optional[str] = Header(None),
):
    """
    Get analytics job status and result with ETag support
    """
    row = mysql_pool.fetchone("SELECT * FROM analytics_jobs WHERE id = %s", (jobId,))

    if not row:
        raise HTTPException(status_code=404, detail="Job not found")

    job_data = row_to_job(row)

    base_url = str(request.base_url).rstrip("/")

    job_response = AnalyticsJobResponse(
        jobId=job_data["jobId"],
        status=job_data["status"],
        message=f"Job is {job_data['status']}",
        links={
            "self": f"{base_url}/analytics/jobs/{jobId}",
            "status": f"{base_url}/analytics/jobs/{jobId}/status",
        },
        result=job_data.get("result") or "",
    )

    etag = generate_etag(job_data)

    if if_none_match and if_none_match == f'"{etag}"':
        raise HTTPException(status_code=304, detail="Not Modified")
    response.headers["ETag"] = f'"{etag}"'

    return job_response


@app.get("/analytics/jobs/{jobId}/status")
async def get_analytics_job_status(jobId: str):
    """
    Get analytics job status only
    """
    row = mysql_pool.fetchone(
        "SELECT id, status FROM analytics_jobs WHERE id = %s", (jobId,)
    )

    if not row:
        raise HTTPException(status_code=404, detail="Job not found")

    return {"jobId": row["id"], "status": row["status"]}
