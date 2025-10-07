#!/bin/bash

# Deploy Edge Functions to Supabase
# Usage: ./deploy-functions.sh YOUR_SUPABASE_TOKEN_HERE

if [ -z "$1" ]; then
  echo "❌ Error: Please provide your Supabase access token"
  echo "Usage: ./deploy-functions.sh sbp_your_token_here"
  echo ""
  echo "Get your token from: https://supabase.com/dashboard/account/tokens"
  exit 1
fi

export SUPABASE_ACCESS_TOKEN="$1"

echo "🔗 Linking project..."
supabase link --project-ref ziypdqsiajnjyygkjtvc

if [ $? -ne 0 ]; then
  echo "❌ Failed to link project"
  exit 1
fi

echo ""
echo "📦 Deploying Edge Functions..."
supabase functions deploy

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Deployment successful!"
  echo ""
  echo "📝 Next steps:"
  echo "1. Add API keys as secrets in Supabase Dashboard:"
  echo "   https://supabase.com/dashboard/project/ziypdqsiajnjyygkjtvc/settings/functions"
  echo ""
  echo "2. Recommended secrets to add:"
  echo "   - OPENAI_API_KEY (for LLM structuring)"
  echo "   - ANTHROPIC_API_KEY (for LLM structuring)"
  echo "   - MISTRAL_API_KEY (for OCR and LLM)"
  echo "   - OCR_SPACE_API_KEY (for OCR - get free key at ocr.space)"
  echo "   - GOOGLE_VISION_API_KEY (optional, for OCR)"
else
  echo "❌ Deployment failed"
  exit 1
fi

