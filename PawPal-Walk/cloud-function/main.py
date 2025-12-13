import base64
import json

def handle_walk_event(event, context):
    if "data" in event:
        decoded = base64.b64decode(event["data"]).decode("utf-8")
        message = json.loads(decoded)
        print("🔥 Cloud Function triggered!")
        print("Event type:", message.get("event_type"))
        print("Payload:", message.get("payload"))
    else:
        print("No data found in event")