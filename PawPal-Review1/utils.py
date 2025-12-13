import json
import hashlib


def generate_etag(data: dict) -> str:
    """Generate ETag from data"""
    content = json.dumps(data, sort_keys=True, default=str)
    return hashlib.md5(content.encode()).hexdigest()
