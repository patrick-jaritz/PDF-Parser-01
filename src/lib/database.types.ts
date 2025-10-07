export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      documents: {
        Row: {
          id: string
          user_id: string | null
          filename: string
          file_size: number
          file_url: string
          upload_date: string
          status: 'uploaded' | 'processing' | 'completed' | 'failed'
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          filename: string
          file_size: number
          file_url: string
          upload_date?: string
          status?: 'uploaded' | 'processing' | 'completed' | 'failed'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          filename?: string
          file_size?: number
          file_url?: string
          upload_date?: string
          status?: 'uploaded' | 'processing' | 'completed' | 'failed'
          created_at?: string
        }
      }
      processing_jobs: {
        Row: {
          id: string
          document_id: string
          structure_template: Json
          extracted_text: string | null
          structured_output: Json | null
          ocr_provider: 'google-vision' | 'mistral' | 'tesseract' | 'aws-textract' | 'azure-document-intelligence' | 'ocr-space'
          llm_provider: string
          processing_time_ms: number | null
          provider_metadata: Json
          page_count: number
          error_message: string | null
          status: 'pending' | 'ocr_processing' | 'llm_processing' | 'completed' | 'failed'
          request_id: string | null
          retry_count: number
          last_error_code: string | null
          error_details: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          document_id: string
          structure_template: Json
          extracted_text?: string | null
          structured_output?: Json | null
          ocr_provider?: 'google-vision' | 'mistral' | 'tesseract' | 'aws-textract' | 'azure-document-intelligence' | 'ocr-space'
          llm_provider?: string
          processing_time_ms?: number | null
          provider_metadata?: Json
          page_count?: number
          error_message?: string | null
          status?: 'pending' | 'ocr_processing' | 'llm_processing' | 'completed' | 'failed'
          request_id?: string | null
          retry_count?: number
          last_error_code?: string | null
          error_details?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          structure_template?: Json
          extracted_text?: string | null
          structured_output?: Json | null
          ocr_provider?: 'google-vision' | 'mistral' | 'tesseract' | 'aws-textract' | 'azure-document-intelligence' | 'ocr-space'
          llm_provider?: string
          processing_time_ms?: number | null
          provider_metadata?: Json
          page_count?: number
          error_message?: string | null
          status?: 'pending' | 'ocr_processing' | 'llm_processing' | 'completed' | 'failed'
          request_id?: string | null
          retry_count?: number
          last_error_code?: string | null
          error_details?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      logs: {
        Row: {
          id: string
          timestamp: string
          severity: 'debug' | 'info' | 'warning' | 'error' | 'critical'
          category: 'ocr' | 'llm' | 'upload' | 'database' | 'api' | 'system' | 'auth' | 'storage'
          message: string
          context: Json
          error_details: Json | null
          user_id: string | null
          job_id: string | null
          document_id: string | null
          request_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          timestamp?: string
          severity: 'debug' | 'info' | 'warning' | 'error' | 'critical'
          category: 'ocr' | 'llm' | 'upload' | 'database' | 'api' | 'system' | 'auth' | 'storage'
          message: string
          context?: Json
          error_details?: Json | null
          user_id?: string | null
          job_id?: string | null
          document_id?: string | null
          request_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          timestamp?: string
          severity?: 'debug' | 'info' | 'warning' | 'error' | 'critical'
          category?: 'ocr' | 'llm' | 'upload' | 'database' | 'api' | 'system' | 'auth' | 'storage'
          message?: string
          context?: Json
          error_details?: Json | null
          user_id?: string | null
          job_id?: string | null
          document_id?: string | null
          request_id?: string | null
          created_at?: string
        }
      }
      performance_metrics: {
        Row: {
          id: string
          job_id: string
          stage: 'upload' | 'ocr' | 'llm' | 'total' | 'storage'
          provider: string | null
          start_time: string
          end_time: string | null
          duration_ms: number | null
          status: 'success' | 'failed' | 'timeout' | 'in_progress'
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          job_id: string
          stage: 'upload' | 'ocr' | 'llm' | 'total' | 'storage'
          provider?: string | null
          start_time: string
          end_time?: string | null
          duration_ms?: number | null
          status: 'success' | 'failed' | 'timeout' | 'in_progress'
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          stage?: 'upload' | 'ocr' | 'llm' | 'total' | 'storage'
          provider?: string | null
          start_time?: string
          end_time?: string | null
          duration_ms?: number | null
          status?: 'success' | 'failed' | 'timeout' | 'in_progress'
          metadata?: Json
          created_at?: string
        }
      }
      api_request_logs: {
        Row: {
          id: string
          job_id: string | null
          provider: string
          provider_type: 'ocr' | 'llm'
          endpoint: string
          request_method: string
          request_headers: Json
          request_payload: Json
          response_status: number | null
          response_headers: Json
          response_body: Json | null
          duration_ms: number | null
          error: string | null
          timestamp: string
          created_at: string
        }
        Insert: {
          id?: string
          job_id?: string | null
          provider: string
          provider_type: 'ocr' | 'llm'
          endpoint: string
          request_method?: string
          request_headers?: Json
          request_payload?: Json
          response_status?: number | null
          response_headers?: Json
          response_body?: Json | null
          duration_ms?: number | null
          error?: string | null
          timestamp?: string
          created_at?: string
        }
        Update: {
          id?: string
          job_id?: string | null
          provider?: string
          provider_type?: 'ocr' | 'llm'
          endpoint?: string
          request_method?: string
          request_headers?: Json
          request_payload?: Json
          response_status?: number | null
          response_headers?: Json
          response_body?: Json | null
          duration_ms?: number | null
          error?: string | null
          timestamp?: string
          created_at?: string
        }
      }
      error_catalog: {
        Row: {
          id: string
          error_code: string
          category: 'configuration' | 'network' | 'provider' | 'validation' | 'system'
          severity: 'warning' | 'error' | 'critical'
          title: string
          description: string
          solution: string
          documentation_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          error_code: string
          category: 'configuration' | 'network' | 'provider' | 'validation' | 'system'
          severity: 'warning' | 'error' | 'critical'
          title: string
          description: string
          solution: string
          documentation_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          error_code?: string
          category?: 'configuration' | 'network' | 'provider' | 'validation' | 'system'
          severity?: 'warning' | 'error' | 'critical'
          title?: string
          description?: string
          solution?: string
          documentation_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      provider_health: {
        Row: {
          id: string
          provider_name: string
          provider_type: 'ocr' | 'llm'
          status: 'healthy' | 'degraded' | 'down' | 'unknown'
          last_check: string
          response_time_ms: number | null
          error_message: string | null
          consecutive_failures: number
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider_name: string
          provider_type: 'ocr' | 'llm'
          status?: 'healthy' | 'degraded' | 'down' | 'unknown'
          last_check?: string
          response_time_ms?: number | null
          error_message?: string | null
          consecutive_failures?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          provider_name?: string
          provider_type?: 'ocr' | 'llm'
          status?: 'healthy' | 'degraded' | 'down' | 'unknown'
          last_check?: string
          response_time_ms?: number | null
          error_message?: string | null
          consecutive_failures?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      provider_configs: {
        Row: {
          id: string
          provider_name: string
          provider_type: 'ocr' | 'llm'
          is_enabled: boolean
          api_endpoint: string | null
          cost_per_page: number | null
          average_processing_time_ms: number | null
          success_rate: number | null
          total_requests: number
          failed_requests: number
          config_metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider_name: string
          provider_type: 'ocr' | 'llm'
          is_enabled?: boolean
          api_endpoint?: string | null
          cost_per_page?: number | null
          average_processing_time_ms?: number | null
          success_rate?: number | null
          total_requests?: number
          failed_requests?: number
          config_metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          provider_name?: string
          provider_type?: 'ocr' | 'llm'
          is_enabled?: boolean
          api_endpoint?: string | null
          cost_per_page?: number | null
          average_processing_time_ms?: number | null
          success_rate?: number | null
          total_requests?: number
          failed_requests?: number
          config_metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      structure_templates: {
        Row: {
          id: string
          user_id: string | null
          name: string
          description: string | null
          template_schema: Json
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          description?: string | null
          template_schema: Json
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          description?: string | null
          template_schema?: Json
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
