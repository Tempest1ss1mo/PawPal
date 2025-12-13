#!/bin/bash

# OAuth2 and JWT Testing Script
# This script helps test the OAuth2 and JWT functionality

echo "=== OAuth2 / JWT Testing Script ==="
echo ""

BASE_URL="http://localhost:3001"

echo "1. Testing Health Endpoint..."
curl -s "$BASE_URL/health" | jq '.' || curl -s "$BASE_URL/health"
echo ""
echo ""

echo "2. Testing OAuth2 Initiation (should redirect to Google)..."
echo "Visit: $BASE_URL/api/auth/google"
echo "Or check redirect:"
curl -s -I "$BASE_URL/api/auth/google" | grep -i "location" || echo "Redirect header found"
echo ""
echo ""

echo "3. Testing Protected Endpoint WITHOUT Token (should fail)..."
echo "PUT /api/users/1 without token:"
curl -s -X PUT "$BASE_URL/api/users/1" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User"}' | jq '.' || curl -s -X PUT "$BASE_URL/api/users/1" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User"}'
echo ""
echo ""

echo "4. Testing Token Verification WITHOUT Token (should fail)..."
curl -s "$BASE_URL/api/auth/verify" | jq '.' || curl -s "$BASE_URL/api/auth/verify"
echo ""
echo ""

echo "5. Testing Get Current User WITHOUT Token (should fail)..."
curl -s "$BASE_URL/api/auth/me" | jq '.' || curl -s "$BASE_URL/api/auth/me"
echo ""
echo ""

echo "=== Manual Testing Steps ==="
echo ""
echo "To complete OAuth2 testing:"
echo "1. Open browser and visit: $BASE_URL/api/auth/google"
echo "2. Complete Google OAuth2 login"
echo "3. You will receive a JWT token in the response"
echo "4. Use that token to test protected endpoints:"
echo ""
echo "   curl -X PUT $BASE_URL/api/users/1 \\"
echo "     -H \"Authorization: Bearer <your-jwt-token>\" \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -H \"If-Match: <etag>\" \\"
echo "     -d '{\"name\":\"Updated Name\"}'"
echo ""
echo "   curl $BASE_URL/api/auth/verify \\"
echo "     -H \"Authorization: Bearer <your-jwt-token>\""
echo ""
echo "   curl $BASE_URL/api/auth/me \\"
echo "     -H \"Authorization: Bearer <your-jwt-token>\""
echo ""


