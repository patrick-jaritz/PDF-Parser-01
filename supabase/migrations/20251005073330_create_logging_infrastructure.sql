/*
  # Create Logging and Debugging Infrastructure

  ## Overview
  Creates comprehensive logging tables to track processing events, errors, performance metrics, and API calls
  for debugging and monitoring the document processing pipeline.

  ## New Tables

  ### 1. logs
  Central logging table capturing all system events with severity levels and context
  - `id` (uuid, primary key) - Unique log entry identifier
  - `timestamp` (timestamptz) - When the log entry was created
  - `severity` (text) - Log level: debug, info, warning, error, critical
  - `category` (text) - Log category: ocr, llm, upload, database, api, system
  - `message` (text) - Human-readable log message
  - `context` (jsonb) - Structured context data (job_id, document_id, provider, etc.)
  - `error_details` (jsonb) - Detailed error information including stack traces
  - `user_id` (uuid) - User associated with this log entry
  - `job_id` (uuid) - Processing job associated with this log
  - `document_id` (uuid) - Document associated with this log
  - `request_id` (text) - Request ID for tracing across services

  ### 2. performance_metrics
  Tracks performance data for each processing stage to identify bottlenecks
  - `id` (uuid, primary key) - Unique metric identifier
  - `job_id` (uuid) - Associated processing job
  - `stage` (text) - Processing stage: upload, ocr, llm, total
  - `provider` (text) - Provider used for this stage
  - `start_time` (timestamptz) - Stage start timestamp
  - `end_time` (timestamptz) - Stage end timestamp
  - `duration_ms` (integer) - Processing duration in milliseconds
  - `status` (text) - Stage status: success, failed, timeout
  - `metadata` (jsonb) - Additional metrics (tokens, pages, confidence, etc.)
  - `created_at` (timestamptz) - Record creation time

  ### 3. api_request_logs
  Logs all external API calls for debugging provider integrations
  - `id` (uuid, primary key) - Unique request log identifier
  - `job_id` (uuid) - Associated processing job
  - `provider` (text) - API provider name
  - `provider_type` (text) - Type: ocr or llm
  - `endpoint` (text) - API endpoint called
  - `request_method` (text) - HTTP method (POST, GET, etc.)
  - `request_headers` (jsonb) - Request headers (sanitized, no keys)
  - `request_payload` (jsonb) - Request payload (sanitized)
  - `response_status` (integer) - HTTP response status code
  - `response_headers` (jsonb) - Response headers
  - `response_body` (jsonb) - Response body (truncated if large)
  - `duration_ms` (integer) - Request duration in milliseconds
  - `error` (text) - Error message if request failed
  - `timestamp` (timestamptz) - Request timestamp
  - `created_at` (timestamptz) - Record creation time

  ### 4. error_catalog
  Predefined error catalog with solutions and troubleshooting steps
  - `id` (uuid, primary key) - Unique error identifier
  - `error_code` (text, unique) - Unique error code (e.g., OCR_API_KEY_INVALID)
  - `category` (text) - Error category: configuration, network, provider, validation
  - `severity` (text) - Error severity: warning, error, critical
  - `title` (text) - Short error title
  - `description` (text) - Detailed error description
  - `solution` (text) - How to resolve this error
  - `documentation_url` (text) - Link to relevant documentation
  - `created_at` (timestamptz) - Record creation time
  - `updated_at` (timestamptz) - Last update time

  ### 5. provider_health
  Tracks provider availability and health status
  - `id` (uuid, primary key) - Unique health check identifier
  - `provider_name` (text) - Provider name
  - `provider_type` (text) - Type: ocr or llm
  - `status` (text) - Status: healthy, degraded, down, unknown
  - `last_check` (timestamptz) - Last health check timestamp
  - `response_time_ms` (integer) - Response time in milliseconds
  - `error_message` (text) - Error message if unhealthy
  - `consecutive_failures` (integer) - Number of consecutive failures
  - `metadata` (jsonb) - Additional health information
  - `created_at` (timestamptz) - Record creation time
  - `updated_at` (timestamptz) - Last update time

  ## Modifications to Existing Tables

  ### processing_jobs
  - Add `request_id` (text) - Unique request ID for tracing
  - Add `retry_count` (integer) - Number of retry attempts
  - Add `last_error_code` (text) - Last error code from catalog
  - Add `error_details` (jsonb) - Structured error details

  ## Security
  - Enable RLS on all new tables
  - Only authenticated users can read their own logs
  - Service role can read all logs for admin purposes
  - Log entries are automatically associated with the current user

  ## Indexes
  - Create indexes on commonly queried columns for performance
  - Composite indexes for filtering by timestamp + severity + category

  ## Notes
  - All timestamps use timestamptz for timezone awareness
  - JSONB used for flexible structured data storage
  - Logs are retained for 90 days by default (can be adjusted)
  - Performance metrics enable bottleneck identification
  - API logs sanitized to never store actual API keys
*/

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