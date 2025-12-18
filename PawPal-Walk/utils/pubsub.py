import json
import uuid
from datetime import datetime

PROJECT_ID = "w4153-walk-service"
TOPIC_ID = "walk-events"

# Initialize Pub/Sub client (optional - fails gracefully if not configured)
publisher = None
topic_path = None

try:
    from google.cloud import pubsub_v1
    publisher = pubsub_v1.PublisherClient()
    topic_path = publisher.topic_path(PROJECT_ID, TOPIC_ID)
    print(f"Pub/Sub initialized: {topic_path}")
except Exception as e:
    print(f"Warning: Pub/Sub not available: {e}")


def encode(obj):
    """Convert UUIDs, datetimes, and other objects to JSON-safe formats."""
    if isinstance(obj, uuid.UUID):
        return str(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, bytes):
        return obj.decode("utf-8")
    return obj


def publish_event(event_type: str, data: dict):
    """Publish event to Pub/Sub. Fails silently if Pub/Sub is not configured."""
    if publisher is None:
        print(f"Skipping event '{event_type}': Pub/Sub not configured")
        return None

    try:
        message = {
            "event_type": event_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat(),
        }

        # Convert all nested objects into JSON-safe versions
        message_json = json.dumps(message, default=encode)
        message_bytes = message_json.encode("utf-8")

        future = publisher.publish(topic_path, message_bytes)
        print(f"Published event: {message_json}")

        return future.result(timeout=5)  # Add timeout to prevent hanging
    except Exception as e:
        print(f"Warning: Failed to publish event '{event_type}': {e}")
        return None  # Don't fail the request if Pub/Sub is unavailable