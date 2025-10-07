#!/bin/bash

SUPABASE_URL=$(grep VITE_SUPABASE_URL .env* 2>/dev/null | head -1 | cut -d'=' -f2)
SUPABASE_KEY=$(grep VITE_SUPABASE_ANON_KEY .env* 2>/dev/null | head -1 | cut -d'=' -f2)

echo "=== Testing All LLM Providers ==="
echo ""

for provider in "openai" "anthropic" "mistral-large"; do
  echo "Testing: $provider"
  response=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/generate-structured-output" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -d "{
      \"jobId\": \"test-job-id\",
      \"extractedText\": \"Test text for $provider\",
      \"structureTemplate\": {
        \"type\": \"object\",
        \"properties\": {
          \"test\": { \"type\": \"string\" }
        }
      },
      \"llmProvider\": \"$provider\"
    }")
  
  if echo "$response" | grep -q "_demo_note"; then
    echo "  ❌ $provider: API key NOT configured (demo mode)"
  elif echo "$response" | grep -q "error"; then
    echo "  ❌ $provider: ERROR - $(echo $response | python3 -c 'import sys, json; print(json.load(sys.stdin).get("error", "Unknown"))')"
  elif echo "$response" | grep -q "success"; then
    actual_provider=$(echo "$response" | python3 -c 'import sys, json; print(json.load(sys.stdin).get("metadata", {}).get("provider", "unknown"))')
    echo "  ✅ $provider: Working (used: $actual_provider)"
  else
    echo "  ⚠️  $provider: Unknown response"
  fi
  echo ""
done

echo "=== Summary ==="
echo "The Edge Function will try providers in order and use the first one that works."
echo "This is why you might see a different provider than requested - it's a fallback mechanism."

