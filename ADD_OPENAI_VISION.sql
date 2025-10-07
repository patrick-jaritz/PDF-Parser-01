-- ============================================================================
-- ADD OPENAI VISION OCR PROVIDER
-- ============================================================================
-- Copy and paste this into your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ziypdqsiajnjyygkjtvc/sql
-- ============================================================================

-- Drop existing check constraint
ALTER TABLE processing_jobs DROP CONSTRAINT IF EXISTS processing_jobs_ocr_provider_check;

-- Add new check constraint with openai-vision
ALTER TABLE processing_jobs
  ADD CONSTRAINT processing_jobs_ocr_provider_check 
  CHECK (ocr_provider IN (
    'google-vision', 
    'mistral', 
    'tesseract', 
    'aws-textract', 
    'azure-document-intelligence', 
    'ocr-space',
    'openai-vision'
  ));

-- Add OpenAI Vision to provider_configs
INSERT INTO provider_configs (provider_name, provider_type, api_endpoint, cost_per_page, config_metadata)
VALUES 
  (
    'openai-vision',
    'ocr',
    'https://api.openai.com/v1/chat/completions',
    0.0001,
    '{"model": "gpt-4o-mini", "supports_images": true, "requires_client_side_pdf_conversion": true}'::jsonb
  )
ON CONFLICT (provider_name) DO UPDATE SET
  api_endpoint = EXCLUDED.api_endpoint,
  cost_per_page = EXCLUDED.cost_per_page,
  config_metadata = EXCLUDED.config_metadata;

-- Add OpenAI Vision to provider_health
INSERT INTO provider_health (provider_name, provider_type, status)
VALUES ('openai-vision', 'ocr', 'unknown')
ON CONFLICT (provider_name, provider_type) DO NOTHING;

-- ✅ Done! OpenAI Vision is now available as an OCR provider.

