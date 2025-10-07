/*
  # Create DocETL Pipeline Tables

  ## Overview
  This migration creates the database schema for DocETL (Document ETL) pipelines,
  a system for creating and executing LLM-powered document processing workflows.

  ## New Tables

  ### 1. `docetl_pipelines`
  Stores pipeline definitions and configurations
  - `id` (uuid, primary key)
  - `name` (text) - Pipeline name
  - `description` (text) - Pipeline description
  - `config` (jsonb) - Full pipeline configuration (operators, datasets, etc)
  - `status` (enum) - Pipeline status
  - `user_id` (uuid) - Creator
  - `is_active` (boolean) - Whether pipeline is active
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `docetl_operators`
  Stores reusable operator definitions
  - `id` (uuid, primary key)
  - `name` (text) - Operator name
  - `type` (enum) - Operator type (map, reduce, filter, resolve, gather, unnest)
  - `config` (jsonb) - Operator configuration
  - `description` (text)
  - `user_id` (uuid)
  - `is_public` (boolean)
  - `created_at` (timestamptz)

  ### 3. `docetl_executions`
  Tracks pipeline execution history
  - `id` (uuid, primary key)
  - `pipeline_id` (uuid, foreign key)
  - `status` (enum) - Execution status
  - `input_data` (jsonb) - Input documents/data
  - `output_data` (jsonb) - Processed output
  - `metrics` (jsonb) - Execution metrics (time, tokens, cost)
  - `error_message` (text)
  - `started_at` (timestamptz)
  - `completed_at` (timestamptz)
  - `user_id` (uuid)

  ### 4. `docetl_datasets`
  Stores datasets used by pipelines
  - `id` (uuid, primary key)
  - `name` (text)
  - `type` (text) - Type of dataset (documents, json, csv, etc)
  - `source` (text) - Source location or query
  - `data` (jsonb) - Actual data or metadata
  - `pipeline_id` (uuid, nullable) - Associated pipeline
  - `user_id` (uuid)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Users can only access their own pipelines and data
  - Public operators can be shared across users
*/

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
