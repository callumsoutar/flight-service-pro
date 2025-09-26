#!/bin/bash
# Quick Security Test - Test Authentication on Fixed Endpoints
#
# This script tests that the endpoints we've fixed properly reject
# unauthenticated requests with 401 status codes

API_BASE="http://localhost:3000"

echo "🔍 Testing Security Fixes - Authentication Required"
echo "=================================================="

# Array of endpoints we've secured
ENDPOINTS=(
    "GET /api/aircraft"
    "POST /api/aircraft" 
    "PATCH /api/aircraft"
    "GET /api/instructors"
    "POST /api/instructors"
    "PATCH /api/instructors"
    "DELETE /api/instructors"
    "GET /api/invoices"
    "POST /api/invoices"
    "PATCH /api/invoices"
    "GET /api/equipment"
    "POST /api/equipment"
    "PATCH /api/equipment"
    "DELETE /api/equipment"
    "GET /api/tasks"
    "POST /api/tasks"
    "GET /api/transactions"
    "GET /api/payments"
    "POST /api/payments"
)

PASSED=0
FAILED=0

for endpoint in "${ENDPOINTS[@]}"; do
    read -r method path <<< "$endpoint"
    
    echo -n "Testing $method $path ... "
    
    # Test without authentication - should get 401
    if [ "$method" = "POST" ] || [ "$method" = "PATCH" ]; then
        response=$(curl -s -w "%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d '{}' \
            "$API_BASE$path" -o /dev/null)
    else
        response=$(curl -s -w "%{http_code}" -X "$method" "$API_BASE$path" -o /dev/null)
    fi
    
    if [ "$response" = "401" ]; then
        echo "✅ PASS (401 Unauthorized)"
        ((PASSED++))
    else
        echo "❌ FAIL (got $response, expected 401)"
        ((FAILED++))
    fi
done

echo ""
echo "Results: $PASSED passed, $FAILED failed"

if [ $FAILED -gt 0 ]; then
    echo "🚨 Security vulnerabilities still exist!"
    exit 1
else
    echo "🛡️  All tested endpoints properly require authentication!"
    exit 0
fi
