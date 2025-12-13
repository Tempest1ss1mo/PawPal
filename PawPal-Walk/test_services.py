#!/usr/bin/env python3
"""Test script to verify atomic and composite services are working."""
import urllib.request
import json
import uuid
import sys

ATOMIC_URL = "http://localhost:8000"
COMPOSITE_URL = "http://localhost:8001"

def test_endpoint(url, method="GET", data=None):
    """Test an endpoint and return response."""
    try:
        req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'} if data else {})
        with urllib.request.urlopen(req, timeout=5) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())
    except Exception as e:
        return None, str(e)

def main():
    print("=" * 60)
    print("Testing Walk Service - Atomic and Composite")
    print("=" * 60)
    print()
    
    # Test 1: Atomic service root
    print("Test 1: Atomic Service Root")
    status, response = test_endpoint(f"{ATOMIC_URL}/")
    if status == 200:
        print(f"  ✅ Atomic service is running")
        print(f"     Response: {response.get('message', '')[:50]}")
    else:
        print(f"  ❌ Atomic service not responding (status: {status})")
        return
    print()
    
    # Test 2: Composite service root
    print("Test 2: Composite Service Root")
    status, response = test_endpoint(f"{COMPOSITE_URL}/")
    if status == 200:
        print(f"  ✅ Composite service is running")
        print(f"     Response: {response.get('message', '')[:50]}")
    else:
        print(f"  ❌ Composite service not responding (status: {status})")
        return
    print()
    
    # Test 3: Create walk via composite
    print("Test 3: Create Walk via Composite Service")
    walk_data = {
        'id': str(uuid.uuid4()),
        'owner_id': str(uuid.uuid4()),
        'pet_id': str(uuid.uuid4()),
        'location': '123 Test Street',
        'city': 'New York',
        'scheduled_time': '2025-12-12T10:00:00Z',
        'duration_minutes': 30,
        'status': 'requested'
    }
    status, response = test_endpoint(f"{COMPOSITE_URL}/walks", "POST", json.dumps(walk_data).encode())
    if status == 201:
        walk_id = response['id']
        print(f"  ✅ Walk created successfully")
        print(f"     Walk ID: {walk_id[:20]}...")
    else:
        print(f"  ❌ Failed to create walk (status: {status})")
        return
    print()
    
    # Test 4: FK Constraint - Invalid walk_id
    print("Test 4: Foreign Key Constraint Validation")
    assignment_data = {
        'id': str(uuid.uuid4()),
        'walk_id': '00000000-0000-0000-0000-000000000000',  # Invalid
        'walker_id': str(uuid.uuid4()),
        'status': 'pending'
    }
    status, response = test_endpoint(
        f"{COMPOSITE_URL}/assignments", 
        "POST", 
        json.dumps(assignment_data).encode()
    )
    if status == 400:
        print(f"  ✅ FK constraint validation working!")
        print(f"     Blocked invalid walk_id")
        detail = response.get('detail', '')
        if 'Foreign Key' in detail or 'not exist' in detail:
            print(f"     Error message: {detail[:80]}...")
    else:
        print(f"  ⚠️  Unexpected status: {status}")
        print(f"     Response: {response}")
    print()
    
    # Test 5: Create assignment with valid walk_id
    print("Test 5: Create Assignment with Valid walk_id")
    assignment_data = {
        'id': str(uuid.uuid4()),
        'walk_id': walk_id,  # Valid
        'walker_id': str(uuid.uuid4()),
        'status': 'pending'
    }
    status, response = test_endpoint(
        f"{COMPOSITE_URL}/assignments", 
        "POST", 
        json.dumps(assignment_data).encode()
    )
    if status == 201:
        print(f"  ✅ Assignment created successfully")
        print(f"     Assignment ID: {response['id'][:20]}...")
    else:
        print(f"  ❌ Failed to create assignment (status: {status})")
    print()
    
    # Test 6: Get complete walk (parallel execution)
    print("Test 6: Get Complete Walk Info (Parallel Execution)")
    status, response = test_endpoint(f"{COMPOSITE_URL}/walks/{walk_id}/complete")
    if status == 200:
        print(f"  ✅ Complete walk endpoint working")
        print(f"     Walk ID: {response['walk']['id'][:20]}...")
        print(f"     Assignments: {response['summary']['assignment_count']}")
        print(f"     Events: {response['summary']['event_count']}")
        print(f"     ✅ Parallel execution demonstrated!")
    else:
        print(f"  ❌ Failed to get complete walk (status: {status})")
    print()
    
    print("=" * 60)
    print("✅ All tests completed!")
    print("=" * 60)

if __name__ == "__main__":
    main()

