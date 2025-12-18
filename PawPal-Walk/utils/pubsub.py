import json
import uuid
from datetime import datetime
from google.cloud import pubsub_v1

PROJECT_ID = "w4153-walk-service"
TOPIC_ID = "walk-events"

publisher = pubsub_v1.PublisherClient()
topic_path = publisher.topic_path(PROJECT_ID, TOPIC_ID)


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

    return future.result()