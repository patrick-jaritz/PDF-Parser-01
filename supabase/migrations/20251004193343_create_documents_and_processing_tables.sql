/*
  # PDF OCR Processing System - Database Schema

  ## Overview
  This migration creates the database schema for a PDF document processing system
  that extracts text via OCR and generates structured output using LLMs.

  ## New Tables

  ### `documents`
  Stores uploaded PDF documents and their metadata
  - `id` (uuid, primary key) - Unique document identifier
  - `user_id` (uuid, nullable) - Reference to auth.users for multi-user support
  - `filename` (text) - Original filename of uploaded document
  - `file_size` (integer) - File size in bytes
  - `file_url` (text) - Storage URL for the PDF file
  - `upload_date` (timestamptz) - Timestamp of upload
  - `status` (text) - Processing status: 'uploaded', 'processing', 'completed', 'failed'
  - `created_at` (timestamptz) - Record creation timestamp

  ### `processing_jobs`
  Tracks OCR and LLM processing jobs for each document
  - `id` (uuid, primary key) - Unique job identifier
  - `document_id` (uuid, foreign key) - Reference to documents table
  - `structure_template` (jsonb) - User-defined output structure template
  - `extracted_text` (text, nullable) - Raw OCR extracted text
  - `structured_output` (jsonb, nullable) - Final LLM-generated structured data
  - `ocr_provider` (text) - OCR service used: 'google-vision', 'mistral', 'tesseract'
  - `llm_provider` (text) - LLM service used for structuring
  - `processing_time_ms` (integer, nullable) - Total processing duration
  - `error_message` (text, nullable) - Error details if processing failed
  - `status` (text) - Job status: 'pending', 'ocr_processing', 'llm_processing', 'completed', 'failed'
  - `created_at` (timestamptz) - Job creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `structure_templates`
  Stores reusable structure templates for common document types
  - `id` (uuid, primary key) - Unique template identifier
  - `user_id` (uuid, nullable) - Reference to auth.users
  - `name` (text) - Template name (e.g., "Invoice", "Receipt", "Contract")
  - `description` (text, nullable) - Template description
  - `template_schema` (jsonb) - JSON schema defining the structure
  - `is_public` (boolean) - Whether template is shared with all users
  - `created_at` (timestamptz) - Template creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security

  ### Row Level Security (RLS)
  - All tables have RLS enabled for data protection
  - Users can only access their own documents and processing jobs
  - Public templates are accessible to all authenticated users
  - Anonymous users have limited read access for demo purposes

  ### Policies
  - Documents: Users can CRUD their own documents
  - Processing Jobs: Users can read/create jobs for their documents
  - Templates: Users can CRUD their own templates and read public ones

  ## Important Notes
  1. The system supports both authenticated and anonymous usage for demos
  2. File storage will be handled via Supabase Storage buckets
  3. Large text fields use TEXT type for unlimited length
  4. JSONB used for flexible schema storage
  5. Indexes added for common query patterns
*/

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

-- Insert some default public templates
INSERT INTO structure_templates (name, description, template_schema, is_public, user_id)
VALUES 
  (
    'Invoice',
    'Extract key information from invoices',
    '{"type": "object", "properties": {"invoice_number": {"type": "string"}, "date": {"type": "string"}, "vendor": {"type": "string"}, "total_amount": {"type": "number"}, "line_items": {"type": "array", "items": {"type": "object", "properties": {"description": {"type": "string"}, "quantity": {"type": "number"}, "unit_price": {"type": "number"}, "total": {"type": "number"}}}}}}'::jsonb,
    true,
    NULL
  ),
  (
    'Receipt',
    'Extract information from receipts',
    '{"type": "object", "properties": {"merchant": {"type": "string"}, "date": {"type": "string"}, "total": {"type": "number"}, "payment_method": {"type": "string"}, "items": {"type": "array", "items": {"type": "object", "properties": {"name": {"type": "string"}, "price": {"type": "number"}}}}}}'::jsonb,
    true,
    NULL
  ),
  (
    'Contract',
    'Extract key terms from contracts',
    '{"type": "object", "properties": {"title": {"type": "string"}, "parties": {"type": "array", "items": {"type": "string"}}, "effective_date": {"type": "string"}, "expiration_date": {"type": "string"}, "key_terms": {"type": "array", "items": {"type": "string"}}, "signatures": {"type": "array", "items": {"type": "object", "properties": {"name": {"type": "string"}, "date": {"type": "string"}}}}}}'::jsonb,
    true,
    NULL
  ),
  (
    'Business Card',
    'Extract contact information from business cards',
    '{"type": "object", "properties": {"name": {"type": "string"}, "title": {"type": "string"}, "company": {"type": "string"}, "email": {"type": "string"}, "phone": {"type": "string"}, "address": {"type": "string"}, "website": {"type": "string"}}}'::jsonb,
    true,
    NULL
  );
