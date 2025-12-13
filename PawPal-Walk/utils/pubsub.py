import json
import uuid
from datetime import datetime
from typing import Optional

PROJECT_ID = "w4153-walk-service"
TOPIC_ID = "walk-events"

# Lazy initialization of publisher to avoid credential errors at import time
_publisher: Optional[object] = None
_topic_path: Optional[str] = None

def _get_publisher():
    """Lazy initialization of Pub/Sub publisher."""
    global _publisher, _topic_path
    if _publisher is None:
        try:
            from google.cloud import pubsub_v1
            _publisher = pubsub_v1.PublisherClient()
            _topic_path = _publisher.topic_path(PROJECT_ID, TOPIC_ID)
        except Exception as e:
            # If credentials are not available, use a mock/no-op publisher
            print(f"Warning: Pub/Sub not available: {e}. Events will be logged but not published.")
            _publisher = None
            _topic_path = None
    return _publisher, _topic_path


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
    
    publisher, topic_path = _get_publisher()
    
    if publisher is None or topic_path is None:
        # If Pub/Sub is not available, just log the event
        print(f"Event (not published): {message_json}")
        return None
    
    message_bytes = message_json.encode("utf-8")
    future = publisher.publish(topic_path, message_bytes)
    print(f"Published event: {message_json}")

    return future.result()