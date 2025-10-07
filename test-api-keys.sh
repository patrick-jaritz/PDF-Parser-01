#!/bin/bash

echo "=== Testing API Keys Configuration ==="
echo ""

# Load environment variables
if [ -f .env.local ]; then
  source .env.local
elif [ -f .env ]; then
  source .env
fi

SUPABASE_URL=$(grep VITE_SUPABASE_URL .env* 2>/dev/null | head -1 | cut -d'=' -f2)
SUPABASE_KEY=$(grep VITE_SUPABASE_ANON_KEY .env* 2>/dev/null | head -1 | cut -d'=' -f2)

echo "Testing LLM Edge Function with OpenAI..."
echo ""

curl -s -X POST "${SUPABASE_URL}/functions/v1/generate-structured-output" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -d '{
    "jobId": "test-job-id",
    "extractedText": "This is a test document with sample text.",
    "structureTemplate": {
      "type": "object",
      "properties": {
        "summary": { "type": "string" },
        "keywords": { "type": "array", "items": { "type": "string" } }
      }
    },
    "llmProvider": "openai"
  }' | python3 -m json.tool

echo ""
echo "If you see a '_demo_note' field, the API key is NOT configured"
echo "If you see actual structured output without '_demo_note', the API key IS configured"

