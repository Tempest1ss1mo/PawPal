# Composite Microservice

This is the composite microservice that orchestrates the atomic Walk Service.

## Quick Start

### 1. Start Atomic Service (Terminal 1)

```bash
# From project root
cd ..
uvicorn main:app --reload --port 8000
```

### 2. Start Composite Service (Terminal 2)

```bash
# From composite-service directory
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

### 3. Access APIs

- Atomic Service: http://localhost:8000/docs
- Composite Service: http://localhost:8001/docs

## Environment Variables

- `ATOMIC_SERVICE_URL`: URL of atomic service (default: `http://localhost:8000`)
- `COMPOSITE_PORT`: Port for composite service (default: `8001`)

## Key Features

1. **Foreign Key Constraints**: Validates `walk_id` exists before creating assignments/events
2. **Parallel Execution**: Uses threads for concurrent operations
3. **Orchestrated Endpoints**: Higher-level operations that coordinate multiple calls

## Example Usage

```bash
# Create a walk
curl -X POST http://localhost:8001/walks \
  -H "Content-Type: application/json" \
  -d '{
    "owner_id": "11111111-1111-1111-1111-111111111111",
    "pet_id": "22222222-2222-2222-2222-222222222222",
    "location": "123 Main St",
    "city": "New York",
    "scheduled_time": "2025-12-12T10:00:00Z",
    "duration_minutes": 30
  }'

# Get complete walk info (parallel execution)
curl http://localhost:8001/walks/{walk_id}/complete

# Assign walker (with FK validation)
curl -X POST "http://localhost:8001/walks/{walk_id}/assign?walker_id={walker_id}"
```

