/*
  # Add Additional OCR Providers and Provider Configuration

  ## Overview
  This migration extends the OCR processing system to support additional providers
  and adds configuration management for provider-specific settings.

  ## Changes

  ### Table Modifications
  1. **processing_jobs**
     - Extend ocr_provider enum to include: aws-textract, azure-document-intelligence, ocr-space
     - Add provider_metadata jsonb column for confidence scores and provider-specific data
     - Add page_count integer column to track multi-page document processing

  2. **New Table: provider_configs**
     - Stores API endpoint URLs and provider-specific settings
     - Tracks provider availability and performance metrics
     - Enables dynamic provider routing and fallback logic

  ## Security
  - Maintains existing RLS policies
  - Provider configs are read-only for clients, managed via Edge Functions

  ## Important Notes
  - Backward compatible with existing 'google-vision', 'mistral', 'tesseract' values
  - Provider metadata stores confidence scores, language detection, and processing details
*/

-- Drop existing check constraint on ocr_provider
ALTER TABLE processing_jobs DROP CONSTRAINT IF EXISTS processing_jobs_ocr_provider_check;

-- Add new columns to processing_jobs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'processing_jobs' AND column_name = 'provider_metadata'
  ) THEN
    ALTER TABLE processing_jobs ADD COLUMN provider_metadata jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'processing_jobs' AND column_name = 'page_count'
  ) THEN
    ALTER TABLE processing_jobs ADD COLUMN page_count integer DEFAULT 1;
  END IF;
END $$;

-- Update ocr_provider column to support new providers
ALTER TABLE processing_jobs 
  ALTER COLUMN ocr_provider TYPE text,
  ALTER COLUMN ocr_provider SET DEFAULT 'google-vision';

-- Add new check constraint with expanded provider list
ALTER TABLE processing_jobs
  ADD CONSTRAINT processing_jobs_ocr_provider_check 
  CHECK (ocr_provider IN (
    'google-vision', 
    'mistral', 
    'tesseract', 
    'aws-textract', 
    'azure-document-intelligence', 
    'ocr-space'
  ));

-- Create provider_configs table
CREATE TABLE IF NOT EXISTS provider_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name text NOT NULL UNIQUE,
  provider_type text NOT NULL CHECK (provider_type IN ('ocr', 'llm')),
  is_enabled boolean DEFAULT true,
  api_endpoint text,
  cost_per_page numeric(10, 4),
  average_processing_time_ms integer,
  success_rate numeric(5, 2),
  total_requests integer DEFAULT 0,
  failed_requests integer DEFAULT 0,
  config_metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default provider configurations
INSERT INTO provider_configs (provider_name, provider_type, api_endpoint, cost_per_page, config_metadata)
VALUES 
  (
    'google-vision',
    'ocr',
    'https://vision.googleapis.com/v1/images:annotate',
    0.0015,
    '{"supports_languages": 200, "supports_handwriting": true, "max_file_size_mb": 20}'::jsonb
  ),
  (
    'mistral',
    'ocr',
    'https://api.mistral.ai/v1/chat/completions',
    0.001,
    '{"model": "pixtral-12b-2409", "supports_pdf": true}'::jsonb
  ),
  (
    'tesseract',
    'ocr',
    'local',
    0.0,
    '{"offline": true, "requires_preprocessing": true}'::jsonb
  ),
  (
    'aws-textract',
    'ocr',
    'https://textract.us-east-1.amazonaws.com',
    0.0015,
    '{"supports_tables": true, "supports_forms": true, "max_file_size_mb": 10}'::jsonb
  ),
  (
    'azure-document-intelligence',
    'ocr',
    null,
    0.0015,
    '{"supports_languages": 25, "supports_layout_analysis": true, "custom_models": true}'::jsonb
  ),
  (
    'ocr-space',
    'ocr',
    'https://api.ocr.space/parse/image',
    0.0,
    '{"free_tier": true, "rate_limit": "500_per_day"}'::jsonb
  ),
  (
    'openai',
    'llm',
    'https://api.openai.com/v1/chat/completions',
    0.0001,
    '{"model": "gpt-4o-mini", "supports_json_mode": true}'::jsonb
  ),
  (
    'anthropic',
    'llm',
    'https://api.anthropic.com/v1/messages',
    0.0003,
    '{"model": "claude-3-5-sonnet-20241022", "max_tokens": 4096}'::jsonb
  ),
  (
    'mistral-large',
    'llm',
    'https://api.mistral.ai/v1/chat/completions',
    0.0002,
    '{"model": "mistral-large-latest", "supports_json_mode": true}'::jsonb
  )
ON CONFLICT (provider_name) DO NOTHING;

-- Create index for provider queries
CREATE INDEX IF NOT EXISTS idx_provider_configs_type_enabled 
  ON provider_configs(provider_type, is_enabled) 
  WHERE is_enabled = true;

-- Enable RLS on provider_configs
ALTER TABLE provider_configs ENABLE ROW LEVEL SECURITY;

-- Allow all users to read provider configs (needed for frontend)
CREATE POLICY "Anyone can view provider configs"
  ON provider_configs FOR SELECT
  TO anon, authenticated
  USING (true);

-- Add index for provider metadata queries
CREATE INDEX IF NOT EXISTS idx_processing_jobs_provider_metadata 
  ON processing_jobs USING gin(provider_metadata);

-- Add index for page count statistics
CREATE INDEX IF NOT EXISTS idx_processing_jobs_page_count 
  ON processing_jobs(page_count) 
  WHERE page_count > 1;
