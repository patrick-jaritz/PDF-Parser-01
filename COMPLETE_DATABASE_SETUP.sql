-- ============================================================================
-- COMPLETE DATABASE SETUP FOR DOC-PARSER
-- ============================================================================
-- This file contains all database migrations in order.
-- Run this in your Supabase Dashboard SQL Editor.
-- 
-- INSTRUCTIONS:
-- 1. Go to https://supabase.com/dashboard/project/ziypdqsiajnjyygkjtvc/sql
-- 2. Copy this entire file
-- 3. Paste into the SQL Editor
-- 4. Click "Run" to execute
-- ============================================================================

-- ============================================================================
-- MIGRATION 1: Create Core Tables
-- ============================================================================

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  filename text NOT NULL,
  file_size integer NOT NULL,
  file_url text NOT NULL,
  upload_date timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'completed', 'failed')),
  created_at timestamptz DEFAULT now()
);

-- Create processing_jobs table
CREATE TABLE IF NOT EXISTS processing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  structure_template jsonb NOT NULL,
  extracted_text text,
  structured_output jsonb,
  ocr_provider text DEFAULT 'google-vision' CHECK (ocr_provider IN ('google-vision', 'mistral', 'tesseract')),
  llm_provider text DEFAULT 'openai',
  processing_time_ms integer,
  error_message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ocr_processing', 'llm_processing', 'completed', 'failed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create structure_templates table
CREATE TABLE IF NOT EXISTS structure_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  template_schema jsonb NOT NULL,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_document_id ON processing_jobs(document_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON structure_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_public ON structure_templates(is_public) WHERE is_public = true;

-- Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE structure_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documents table
CREATE POLICY "Users can view their own documents"
  ON documents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anonymous users can view their session documents"
  ON documents FOR SELECT
  TO anon
  USING (user_id IS NULL);

CREATE POLICY "Users can insert their own documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anonymous users can insert documents"
  ON documents FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Users can update their own documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anonymous users can update their documents"
  ON documents FOR UPDATE
  TO anon
  USING (user_id IS NULL)
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Users can delete their own documents"
  ON documents FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for processing_jobs table
CREATE POLICY "Users can view jobs for their documents"
  ON processing_jobs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = processing_jobs.document_id
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Anonymous users can view their jobs"
  ON processing_jobs FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = processing_jobs.document_id
      AND documents.user_id IS NULL
    )
  );

CREATE POLICY "Users can create jobs for their documents"
  ON processing_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = processing_jobs.document_id
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Anonymous users can create jobs"
  ON processing_jobs FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = processing_jobs.document_id
      AND documents.user_id IS NULL
    )
  );

CREATE POLICY "Users can update jobs for their documents"
  ON processing_jobs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = processing_jobs.document_id
      AND documents.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = processing_jobs.document_id
      AND documents.user_id = auth.uid()
    )
  );

-- RLS Policies for structure_templates table
CREATE POLICY "Users can view their own templates"
  ON structure_templates FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Anonymous users can view public templates"
  ON structure_templates FOR SELECT
  TO anon
  USING (is_public = true);

CREATE POLICY "Users can insert their own templates"
  ON structure_templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON structure_templates FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON structure_templates FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- MIGRATION 2: Add Additional OCR Providers
-- ============================================================================

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
  ('google-vision', 'ocr', 'https://vision.googleapis.com/v1/images:annotate', 0.0015, '{"supports_languages": 200, "supports_handwriting": true, "max_file_size_mb": 20}'::jsonb),
  ('mistral', 'ocr', 'https://api.mistral.ai/v1/chat/completions', 0.001, '{"model": "pixtral-12b-2409", "supports_pdf": true}'::jsonb),
  ('tesseract', 'ocr', 'local', 0.0, '{"offline": true, "requires_preprocessing": true}'::jsonb),
  ('aws-textract', 'ocr', 'https://textract.us-east-1.amazonaws.com', 0.0015, '{"supports_tables": true, "supports_forms": true, "max_file_size_mb": 10}'::jsonb),
  ('azure-document-intelligence', 'ocr', null, 0.0015, '{"supports_languages": 25, "supports_layout_analysis": true, "custom_models": true}'::jsonb),
  ('ocr-space', 'ocr', 'https://api.ocr.space/parse/image', 0.0, '{"free_tier": true, "rate_limit": "500_per_day"}'::jsonb),
  ('openai', 'llm', 'https://api.openai.com/v1/chat/completions', 0.0001, '{"model": "gpt-4o-mini", "supports_json_mode": true}'::jsonb),
  ('anthropic', 'llm', 'https://api.anthropic.com/v1/messages', 0.0003, '{"model": "claude-3-5-sonnet-20241022", "max_tokens": 4096}'::jsonb),
  ('mistral-large', 'llm', 'https://api.mistral.ai/v1/chat/completions', 0.0002, '{"model": "mistral-large-latest", "supports_json_mode": true}'::jsonb)
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

-- ============================================================================
-- MIGRATION 3: Create Storage Bucket
-- ============================================================================

-- Create storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pdfs',
  'pdfs',
  true,
  52428800,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for anonymous users
CREATE POLICY "Anonymous users can upload PDFs"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (
    bucket_id = 'pdfs' AND
    (storage.foldername(name))[1] = 'documents'
  );

CREATE POLICY "Anyone can read PDFs"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'pdfs');

-- Storage policies for authenticated users
CREATE POLICY "Authenticated users can upload PDFs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pdfs' AND
    (storage.foldername(name))[1] = 'documents'
  );

CREATE POLICY "Users can delete their own PDFs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'pdfs' AND
    auth.uid()::text = (storage.foldername(name))[2]
  );

-- Storage policy for service role cleanup
CREATE POLICY "Service role can manage all PDFs"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'pdfs')
  WITH CHECK (bucket_id = 'pdfs');

-- ============================================================================
-- MIGRATION 4: Create Default Admin User
-- ============================================================================

-- Check if admin user already exists, if not create it
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Check if user already exists
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@example.com';
  
  -- If user doesn't exist, create it
  IF admin_user_id IS NULL THEN
    -- Generate a new UUID for the admin user
    admin_user_id := gen_random_uuid();
    
    -- Insert admin user into auth.users table
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      admin_user_id,
      'authenticated',
      'authenticated',
      'admin@example.com',
      crypt('admin123', gen_salt('bf')),
      now(),
      '{"role": "admin"}'::jsonb,
      '{"role": "admin"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
    
    -- Insert into auth.identities for email provider
    INSERT INTO auth.identities (
      provider_id,
      id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      admin_user_id::text,
      gen_random_uuid(),
      admin_user_id,
      format('{"sub":"%s","email":"admin@example.com","email_verified":true,"phone_verified":false}', admin_user_id::text)::jsonb,
      'email',
      now(),
      now(),
      now()
    );
  END IF;
END $$;

-- ============================================================================
-- MIGRATION 5: Create Logging Infrastructure
-- ============================================================================

-- Create logs table
CREATE TABLE IF NOT EXISTS logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamptz DEFAULT now() NOT NULL,
  severity text NOT NULL CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
  category text NOT NULL CHECK (category IN ('ocr', 'llm', 'upload', 'database', 'api', 'system', 'auth', 'storage')),
  message text NOT NULL,
  context jsonb DEFAULT '{}'::jsonb,
  error_details jsonb,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  job_id uuid REFERENCES processing_jobs(id) ON DELETE CASCADE,
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  request_id text,
  created_at timestamptz DEFAULT now()
);

-- Create performance_metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES processing_jobs(id) ON DELETE CASCADE NOT NULL,
  stage text NOT NULL CHECK (stage IN ('upload', 'ocr', 'llm', 'total', 'storage')),
  provider text,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  duration_ms integer,
  status text NOT NULL CHECK (status IN ('success', 'failed', 'timeout', 'in_progress')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create api_request_logs table
CREATE TABLE IF NOT EXISTS api_request_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES processing_jobs(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_type text NOT NULL CHECK (provider_type IN ('ocr', 'llm')),
  endpoint text NOT NULL,
  request_method text NOT NULL DEFAULT 'POST',
  request_headers jsonb DEFAULT '{}'::jsonb,
  request_payload jsonb DEFAULT '{}'::jsonb,
  response_status integer,
  response_headers jsonb DEFAULT '{}'::jsonb,
  response_body jsonb,
  duration_ms integer,
  error text,
  timestamp timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create error_catalog table
CREATE TABLE IF NOT EXISTS error_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_code text UNIQUE NOT NULL,
  category text NOT NULL CHECK (category IN ('configuration', 'network', 'provider', 'validation', 'system')),
  severity text NOT NULL CHECK (severity IN ('warning', 'error', 'critical')),
  title text NOT NULL,
  description text NOT NULL,
  solution text NOT NULL,
  documentation_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create provider_health table
CREATE TABLE IF NOT EXISTS provider_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name text NOT NULL,
  provider_type text NOT NULL CHECK (provider_type IN ('ocr', 'llm')),
  status text NOT NULL CHECK (status IN ('healthy', 'degraded', 'down', 'unknown')) DEFAULT 'unknown',
  last_check timestamptz DEFAULT now(),
  response_time_ms integer,
  error_message text,
  consecutive_failures integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(provider_name, provider_type)
);

-- Add new columns to processing_jobs table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'processing_jobs' AND column_name = 'request_id'
  ) THEN
    ALTER TABLE processing_jobs ADD COLUMN request_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'processing_jobs' AND column_name = 'retry_count'
  ) THEN
    ALTER TABLE processing_jobs ADD COLUMN retry_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'processing_jobs' AND column_name = 'last_error_code'
  ) THEN
    ALTER TABLE processing_jobs ADD COLUMN last_error_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'processing_jobs' AND column_name = 'error_details'
  ) THEN
    ALTER TABLE processing_jobs ADD COLUMN error_details jsonb;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_severity ON logs(severity);
CREATE INDEX IF NOT EXISTS idx_logs_category ON logs(category);
CREATE INDEX IF NOT EXISTS idx_logs_job_id ON logs(job_id);
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_request_id ON logs(request_id);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp_severity ON logs(timestamp DESC, severity);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_job_id ON performance_metrics(job_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_stage ON performance_metrics(stage);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON performance_metrics(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_request_logs_job_id ON api_request_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_provider ON api_request_logs(provider);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_timestamp ON api_request_logs(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_provider_health_provider ON provider_health(provider_name, provider_type);
CREATE INDEX IF NOT EXISTS idx_provider_health_status ON provider_health(status);

-- Enable Row Level Security
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_health ENABLE ROW LEVEL SECURITY;

-- RLS Policies for logs table
CREATE POLICY "Users can view their own logs"
  ON logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can view all logs"
  ON logs FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "System can insert logs"
  ON logs FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- RLS Policies for performance_metrics table
CREATE POLICY "Users can view metrics for their jobs"
  ON performance_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM processing_jobs
      WHERE processing_jobs.id = performance_metrics.job_id
      AND processing_jobs.document_id IN (
        SELECT id FROM documents WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Service role can view all metrics"
  ON performance_metrics FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "System can insert metrics"
  ON performance_metrics FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- RLS Policies for api_request_logs table
CREATE POLICY "Users can view API logs for their jobs"
  ON api_request_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM processing_jobs
      WHERE processing_jobs.id = api_request_logs.job_id
      AND processing_jobs.document_id IN (
        SELECT id FROM documents WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Service role can view all API logs"
  ON api_request_logs FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "System can insert API logs"
  ON api_request_logs FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- RLS Policies for error_catalog table (public read)
CREATE POLICY "Anyone can view error catalog"
  ON error_catalog FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Only service role can manage error catalog"
  ON error_catalog FOR ALL
  TO service_role
  USING (true);

-- RLS Policies for provider_health table (public read)
CREATE POLICY "Anyone can view provider health"
  ON provider_health FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "System can update provider health"
  ON provider_health FOR ALL
  TO authenticated, anon
  WITH CHECK (true);

-- Insert common error codes into catalog
INSERT INTO error_catalog (error_code, category, severity, title, description, solution) VALUES
  ('OCR_API_KEY_MISSING', 'configuration', 'critical', 'OCR API Key Not Configured', 'The selected OCR provider requires an API key, but none is configured in the system.', 'Configure the API key in your environment variables or select a different OCR provider.'),
  ('LLM_API_KEY_MISSING', 'configuration', 'critical', 'LLM API Key Not Configured', 'The selected LLM provider requires an API key, but none is configured in the system.', 'Configure the API key in your environment variables or select a different LLM provider.'),
  ('NETWORK_TIMEOUT', 'network', 'error', 'Network Request Timeout', 'The request to the external service timed out.', 'Check your internet connection and try again. The service may be temporarily unavailable.'),
  ('PROVIDER_API_ERROR', 'provider', 'error', 'Provider API Error', 'The external provider API returned an error.', 'Check the provider status and verify your API credentials are valid.'),
  ('INVALID_PDF_FORMAT', 'validation', 'error', 'Invalid PDF Format', 'The uploaded file is not a valid PDF or is corrupted.', 'Ensure the file is a valid PDF document and try uploading again.'),
  ('FILE_TOO_LARGE', 'validation', 'error', 'File Size Exceeds Limit', 'The uploaded file exceeds the maximum allowed size.', 'Reduce the file size or split the document into smaller files.'),
  ('RATE_LIMIT_EXCEEDED', 'provider', 'warning', 'API Rate Limit Exceeded', 'The provider API rate limit has been exceeded.', 'Wait a few minutes before retrying or upgrade your provider API plan.'),
  ('OCR_NO_TEXT_FOUND', 'provider', 'warning', 'No Text Found', 'The OCR provider could not extract any text from the document.', 'Ensure the document contains readable text and is not blank or heavily distorted.'),
  ('LLM_PARSING_ERROR', 'provider', 'error', 'LLM Output Parsing Error', 'Failed to parse structured output from the LLM response.', 'The LLM may have returned invalid JSON. Try with a different provider or adjust your template.')
ON CONFLICT (error_code) DO NOTHING;

-- Initialize provider health status for known providers
INSERT INTO provider_health (provider_name, provider_type, status) VALUES
  ('google-vision', 'ocr', 'unknown'),
  ('mistral', 'ocr', 'unknown'),
  ('aws-textract', 'ocr', 'unknown'),
  ('azure-document-intelligence', 'ocr', 'unknown'),
  ('ocr-space', 'ocr', 'unknown'),
  ('tesseract', 'ocr', 'unknown'),
  ('openai', 'llm', 'unknown'),
  ('anthropic', 'llm', 'unknown'),
  ('mistral-large', 'llm', 'unknown')
ON CONFLICT (provider_name, provider_type) DO NOTHING;

-- ============================================================================
-- MIGRATION 6: Update Storage Bucket for Images
-- ============================================================================

-- Update the storage bucket to accept images in addition to PDFs
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
]
WHERE id = 'pdfs';

-- ============================================================================
-- MIGRATION 7: Create DocETL Pipeline Tables
-- ============================================================================

-- Create enums
DO $$ BEGIN
  CREATE TYPE pipeline_status AS ENUM ('draft', 'active', 'archived', 'error');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE operator_type AS ENUM (
    'map',
    'reduce', 
    'filter',
    'resolve',
    'gather',
    'unnest',
    'split',
    'join'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE execution_status AS ENUM (
    'pending',
    'running',
    'completed',
    'failed',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create pipelines table
CREATE TABLE IF NOT EXISTS docetl_pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  config jsonb NOT NULL DEFAULT '{}',
  status pipeline_status NOT NULL DEFAULT 'draft',
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create operators table
CREATE TABLE IF NOT EXISTS docetl_operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type operator_type NOT NULL,
  config jsonb NOT NULL DEFAULT '{}',
  description text,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create executions table
CREATE TABLE IF NOT EXISTS docetl_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid REFERENCES docetl_pipelines(id) ON DELETE CASCADE,
  status execution_status NOT NULL DEFAULT 'pending',
  input_data jsonb DEFAULT '{}',
  output_data jsonb DEFAULT '{}',
  metrics jsonb DEFAULT '{}',
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create datasets table
CREATE TABLE IF NOT EXISTS docetl_datasets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'documents',
  source text,
  data jsonb DEFAULT '{}',
  pipeline_id uuid REFERENCES docetl_pipelines(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_docetl_pipelines_user ON docetl_pipelines(user_id);
CREATE INDEX IF NOT EXISTS idx_docetl_pipelines_status ON docetl_pipelines(status);
CREATE INDEX IF NOT EXISTS idx_docetl_operators_user ON docetl_operators(user_id);
CREATE INDEX IF NOT EXISTS idx_docetl_operators_type ON docetl_operators(type);
CREATE INDEX IF NOT EXISTS idx_docetl_operators_public ON docetl_operators(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_docetl_executions_pipeline ON docetl_executions(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_docetl_executions_user ON docetl_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_docetl_executions_status ON docetl_executions(status);
CREATE INDEX IF NOT EXISTS idx_docetl_datasets_user ON docetl_datasets(user_id);
CREATE INDEX IF NOT EXISTS idx_docetl_datasets_pipeline ON docetl_datasets(pipeline_id);

-- Enable Row Level Security
ALTER TABLE docetl_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE docetl_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE docetl_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE docetl_datasets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pipelines
CREATE POLICY "Users can view own pipelines"
  ON docetl_pipelines FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own pipelines"
  ON docetl_pipelines FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pipelines"
  ON docetl_pipelines FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own pipelines"
  ON docetl_pipelines FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for operators
CREATE POLICY "Users can view own and public operators"
  ON docetl_operators FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create own operators"
  ON docetl_operators FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own operators"
  ON docetl_operators FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own operators"
  ON docetl_operators FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for executions
CREATE POLICY "Users can view own executions"
  ON docetl_executions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own executions"
  ON docetl_executions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own executions"
  ON docetl_executions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for datasets
CREATE POLICY "Users can view own datasets"
  ON docetl_datasets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own datasets"
  ON docetl_datasets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own datasets"
  ON docetl_datasets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own datasets"
  ON docetl_datasets FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for pipelines updated_at
DROP TRIGGER IF EXISTS update_docetl_pipelines_updated_at ON docetl_pipelines;
CREATE TRIGGER update_docetl_pipelines_updated_at
  BEFORE UPDATE ON docetl_pipelines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MIGRATION 8: Add Exam Questions Template
-- ============================================================================

-- Insert exam questions template
INSERT INTO structure_templates (name, description, template_schema, is_public, user_id)
VALUES
  (
    'Exam Questions',
    'Extract exam questions with answers, topics, tags, and difficulty levels',
    '{
      "type": "object",
      "properties": {
        "exam_title": {"type": "string"},
        "subject": {"type": "string"},
        "total_questions": {"type": "number"},
        "questions": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "question_number": {"type": "number"},
              "question": {"type": "string"},
              "answer_1": {"type": "string"},
              "answer_2": {"type": "string"},
              "answer_3": {"type": "string"},
              "answer_4": {"type": "string"},
              "answer_5": {"type": "string"},
              "correct_answer": {"type": "string"},
              "topic": {"type": "string"},
              "tags": {
                "type": "array",
                "items": {"type": "string"}
              },
              "difficulty": {"type": "string"},
              "points": {"type": "number"},
              "explanation": {"type": "string"}
            }
          }
        }
      }
    }'::jsonb,
    true,
    NULL
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- MIGRATION 9: Add Comprehensive Templates (12 New Templates)
-- ============================================================================

-- First, delete duplicate templates if they exist
DELETE FROM structure_templates 
WHERE name IN ('Invoice', 'Receipt', 'Contract', 'Business Card', 'Exam Questions')
  AND is_public = true;

-- Now insert all templates (including updated versions)
-- Order: Priority templates first, then others
INSERT INTO structure_templates (name, description, template_schema, is_public, user_id)
VALUES
  -- 1. Exam Questions (PRIORITY)
  (
    'Exam Questions',
    'Extract exam questions with answers, topics, tags, and difficulty levels',
    '{"type":"object","properties":{"exam_title":{"type":"string"},"subject":{"type":"string"},"total_questions":{"type":"number"},"questions":{"type":"array","items":{"type":"object","properties":{"question_number":{"type":"number"},"question":{"type":"string"},"answer_1":{"type":"string"},"answer_2":{"type":"string"},"answer_3":{"type":"string"},"answer_4":{"type":"string"},"answer_5":{"type":"string"},"correct_answer":{"type":"string"},"topic":{"type":"string"},"tags":{"type":"array","items":{"type":"string"}},"difficulty":{"type":"string"},"points":{"type":"number"},"explanation":{"type":"string"}}}}}}'::jsonb,
    true,
    NULL
  ),
  -- 2. Receipt (PRIORITY)
  (
    'Receipt',
    'Extract receipt information including store details, items, and payment',
    '{"type":"object","properties":{"store_name":{"type":"string"},"store_address":{"type":"string"},"store_phone":{"type":"string"},"transaction_date":{"type":"string"},"transaction_time":{"type":"string"},"receipt_number":{"type":"string"},"cashier_name":{"type":"string"},"items":{"type":"array","items":{"type":"object","properties":{"name":{"type":"string"},"quantity":{"type":"number"},"unit_price":{"type":"number"},"total_price":{"type":"number"}}}},"subtotal":{"type":"number"},"tax":{"type":"number"},"total":{"type":"number"},"payment_method":{"type":"string"},"card_last_4":{"type":"string"}}}'::jsonb,
    true,
    NULL
  ),
  -- 3. Medical Record (PRIORITY)
  (
    'Medical Record',
    'Extract medical record information including patient details, diagnosis, and treatment',
    '{"type":"object","properties":{"patient_name":{"type":"string"},"patient_id":{"type":"string"},"date_of_birth":{"type":"string"},"date_of_visit":{"type":"string"},"doctor_name":{"type":"string"},"facility_name":{"type":"string"},"chief_complaint":{"type":"string"},"symptoms":{"type":"array","items":{"type":"string"}},"diagnosis":{"type":"string"},"medications":{"type":"array","items":{"type":"object","properties":{"name":{"type":"string"},"dosage":{"type":"string"},"frequency":{"type":"string"},"duration":{"type":"string"}}}},"tests_ordered":{"type":"array","items":{"type":"string"}},"follow_up":{"type":"string"},"notes":{"type":"string"}}}'::jsonb,
    true,
    NULL
  ),
  -- 4. Lab Report (PRIORITY)
  (
    'Lab Report',
    'Extract laboratory test results and findings',
    '{"type":"object","properties":{"patient_name":{"type":"string"},"patient_id":{"type":"string"},"test_date":{"type":"string"},"report_date":{"type":"string"},"ordering_physician":{"type":"string"},"lab_name":{"type":"string"},"test_results":{"type":"array","items":{"type":"object","properties":{"test_name":{"type":"string"},"result":{"type":"string"},"normal_range":{"type":"string"},"units":{"type":"string"},"flag":{"type":"string"}}}},"overall_findings":{"type":"string"},"recommendations":{"type":"string"},"technician_name":{"type":"string"}}}'::jsonb,
    true,
    NULL
  ),
  -- 5. Meeting Minutes (PRIORITY)
  (
    'Meeting Minutes',
    'Extract meeting notes including attendees, agenda items, decisions, and action items',
    '{"type":"object","properties":{"meeting_title":{"type":"string"},"date":{"type":"string"},"time":{"type":"string"},"location":{"type":"string"},"attendees":{"type":"array","items":{"type":"string"}},"absent":{"type":"array","items":{"type":"string"}},"agenda_items":{"type":"array","items":{"type":"object","properties":{"topic":{"type":"string"},"discussion":{"type":"string"},"decision":{"type":"string"},"vote_result":{"type":"string"}}}},"action_items":{"type":"array","items":{"type":"object","properties":{"task":{"type":"string"},"assignee":{"type":"string"},"due_date":{"type":"string"},"priority":{"type":"string"},"status":{"type":"string"}}}},"next_meeting":{"type":"string"},"notes":{"type":"string"}}}'::jsonb,
    true,
    NULL
  ),
  -- 6. Document Summary (PRIORITY)
  (
    'Document Summary',
    'Extract a general summary with title, dates, authors, and key points',
    '{"type":"object","properties":{"title":{"type":"string"},"document_type":{"type":"string"},"date":{"type":"string"},"author":{"type":"string"},"organization":{"type":"string"},"summary":{"type":"string"},"key_points":{"type":"array","items":{"type":"string"}},"conclusions":{"type":"string"},"recommendations":{"type":"array","items":{"type":"string"}},"references":{"type":"array","items":{"type":"string"}}}}'::jsonb,
    true,
    NULL
  ),
  -- 7. Invoice
  (
    'Invoice',
    'Extract invoice details including items, amounts, dates, and vendor information',
    '{"type":"object","properties":{"invoice_number":{"type":"string"},"invoice_date":{"type":"string"},"due_date":{"type":"string"},"vendor_name":{"type":"string"},"vendor_address":{"type":"string"},"vendor_email":{"type":"string"},"vendor_phone":{"type":"string"},"customer_name":{"type":"string"},"customer_address":{"type":"string"},"items":{"type":"array","items":{"type":"object","properties":{"description":{"type":"string"},"quantity":{"type":"number"},"unit_price":{"type":"number"},"total":{"type":"number"}}}},"subtotal":{"type":"number"},"tax":{"type":"number"},"tax_rate":{"type":"number"},"total_amount":{"type":"number"},"payment_terms":{"type":"string"},"notes":{"type":"string"}}}'::jsonb,
    true,
    NULL
  ),
  -- 8. Contract
  (
    'Contract',
    'Extract contract details including parties, dates, terms, and clauses',
    '{"type":"object","properties":{"contract_title":{"type":"string"},"contract_type":{"type":"string"},"contract_number":{"type":"string"},"contract_date":{"type":"string"},"effective_date":{"type":"string"},"expiration_date":{"type":"string"},"party_1":{"type":"object","properties":{"name":{"type":"string"},"address":{"type":"string"},"role":{"type":"string"},"representative":{"type":"string"}}},"party_2":{"type":"object","properties":{"name":{"type":"string"},"address":{"type":"string"},"role":{"type":"string"},"representative":{"type":"string"}}},"terms":{"type":"array","items":{"type":"string"}},"payment_terms":{"type":"string"},"termination_clause":{"type":"string"},"renewal_terms":{"type":"string"},"governing_law":{"type":"string"},"jurisdiction":{"type":"string"}}}'::jsonb,
    true,
    NULL
  ),
  -- 9. Resume/CV
  (
    'Resume/CV',
    'Extract resume information including personal details, education, work experience, and skills',
    '{"type":"object","properties":{"full_name":{"type":"string"},"email":{"type":"string"},"phone":{"type":"string"},"address":{"type":"string"},"linkedin":{"type":"string"},"website":{"type":"string"},"professional_summary":{"type":"string"},"education":{"type":"array","items":{"type":"object","properties":{"degree":{"type":"string"},"field_of_study":{"type":"string"},"institution":{"type":"string"},"graduation_year":{"type":"string"},"gpa":{"type":"string"},"honors":{"type":"string"}}}},"work_experience":{"type":"array","items":{"type":"object","properties":{"job_title":{"type":"string"},"company":{"type":"string"},"location":{"type":"string"},"start_date":{"type":"string"},"end_date":{"type":"string"},"responsibilities":{"type":"array","items":{"type":"string"}},"achievements":{"type":"array","items":{"type":"string"}}}}},"skills":{"type":"array","items":{"type":"string"}},"certifications":{"type":"array","items":{"type":"object","properties":{"name":{"type":"string"},"issuer":{"type":"string"},"date":{"type":"string"}}}},"languages":{"type":"array","items":{"type":"object","properties":{"language":{"type":"string"},"proficiency":{"type":"string"}}}}}}'::jsonb,
    true,
    NULL
  ),
  -- 10. Product Catalog
  (
    'Product Catalog',
    'Extract product catalog information including items, prices, and specifications',
    '{"type":"object","properties":{"catalog_name":{"type":"string"},"catalog_date":{"type":"string"},"company_name":{"type":"string"},"products":{"type":"array","items":{"type":"object","properties":{"product_name":{"type":"string"},"product_code":{"type":"string"},"category":{"type":"string"},"price":{"type":"number"},"description":{"type":"string"},"specifications":{"type":"array","items":{"type":"string"}},"availability":{"type":"string"},"dimensions":{"type":"string"},"weight":{"type":"string"}}}}}}'::jsonb,
    true,
    NULL
  ),
  -- 11. Real Estate Listing
  (
    'Real Estate Listing',
    'Extract property listing details including features, price, and specifications',
    '{"type":"object","properties":{"property_address":{"type":"string"},"listing_price":{"type":"number"},"property_type":{"type":"string"},"bedrooms":{"type":"number"},"bathrooms":{"type":"number"},"square_footage":{"type":"number"},"lot_size":{"type":"string"},"year_built":{"type":"number"},"features":{"type":"array","items":{"type":"string"}},"appliances":{"type":"array","items":{"type":"string"}},"description":{"type":"string"},"hoa_fees":{"type":"number"},"property_taxes":{"type":"number"},"agent_name":{"type":"string"},"agent_contact":{"type":"string"},"showing_instructions":{"type":"string"}}}'::jsonb,
    true,
    NULL
  ),
  -- 12. Business Card
  (
    'Business Card',
    'Extract business card information including contact details',
    '{"type":"object","properties":{"full_name":{"type":"string"},"job_title":{"type":"string"},"company_name":{"type":"string"},"email":{"type":"string"},"phone":{"type":"string"},"mobile":{"type":"string"},"fax":{"type":"string"},"website":{"type":"string"},"address":{"type":"string"},"linkedin":{"type":"string"},"other_social":{"type":"string"}}}'::jsonb,
    true,
    NULL
  ),
  -- 13. Purchase Order
  (
    'Purchase Order',
    'Extract purchase order details including items, quantities, and delivery info',
    '{"type":"object","properties":{"po_number":{"type":"string"},"po_date":{"type":"string"},"buyer_name":{"type":"string"},"buyer_address":{"type":"string"},"supplier_name":{"type":"string"},"supplier_address":{"type":"string"},"ship_to_address":{"type":"string"},"delivery_date":{"type":"string"},"items":{"type":"array","items":{"type":"object","properties":{"item_code":{"type":"string"},"description":{"type":"string"},"quantity":{"type":"number"},"unit_price":{"type":"number"},"total":{"type":"number"}}}},"subtotal":{"type":"number"},"shipping":{"type":"number"},"tax":{"type":"number"},"total_amount":{"type":"number"},"payment_terms":{"type":"string"},"special_instructions":{"type":"string"}}}'::jsonb,
    true,
    NULL
  ),
  -- 14. Document Analysis
  (
    'Document Analysis',
    'Advanced document analysis with core ideas, recommendations, actionable steps, and confidence scoring',
    '{"type":"object","properties":{"metadata":{"type":"object","properties":{"document_title":{"type":"string"},"author":{"type":"string"},"source_type":{"type":"string"},"date":{"type":"string"},"parsed_by":{"type":"string"},"analysis_level":{"type":"string","enum":["overview","detailed","critical"]},"tone":{"type":"string","enum":["neutral","persuasive","reflective"]},"confidence_score":{"type":"number"}}},"content_analysis":{"type":"object","properties":{"core_idea":{"type":"object","properties":{"short_summary":{"type":"string"},"detailed_summary":{"type":"string"},"key_points":{"type":"array","items":{"type":"string"}},"supporting_evidence":{"type":"array","items":{"type":"string"}},"confidence":{"type":"number"}}},"personal_recommendation":{"type":"object","properties":{"context":{"type":"string"},"suggested_action":{"type":"string"},"rationale":{"type":"string"},"expected_outcome":{"type":"string"},"confidence":{"type":"number"}}},"actionable_next_steps":{"type":"array","items":{"type":"object","properties":{"step_id":{"type":"number"},"description":{"type":"string"},"priority":{"type":"string","enum":["high","medium","low"]},"deadline":{"type":"string"},"dependencies":{"type":"array","items":{"type":"string"}},"required_resources":{"type":"array","items":{"type":"string"}},"impact_estimate":{"type":"string"},"success_metric":{"type":"string"},"confidence":{"type":"number"}}}}}},"notes":{"type":"object","properties":{"open_questions":{"type":"array","items":{"type":"string"}},"related_topics":{"type":"array","items":{"type":"string"}},"references":{"type":"array","items":{"type":"string"}}}}}}'::jsonb,
    true,
    NULL
  );

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================
-- Your database is now ready to use!
-- 
-- Next steps:
-- 1. Update your .env file with the new Supabase credentials
-- 2. Configure API keys for OCR and LLM providers in Supabase Dashboard
-- 3. Test the application
-- ============================================================================

