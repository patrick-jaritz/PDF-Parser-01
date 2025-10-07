import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";

type LogSeverity = 'debug' | 'info' | 'warning' | 'error' | 'critical';
type LogCategory = 'ocr' | 'llm' | 'upload' | 'database' | 'api' | 'system' | 'auth' | 'storage';

interface LogEntry {
  severity: LogSeverity;
  category: LogCategory;
  message: string;
  context?: Record<string, any>;
  error?: Error | unknown;
  jobId?: string;
  documentId?: string;
  requestId?: string;
}

export class EdgeLogger {
  constructor(
    private supabaseClient: SupabaseClient,
    private requestId: string
  ) {}

  private extractErrorDetails(error: unknown): Record<string, any> | null {
    if (!error) return null;

    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    if (typeof error === 'string') {
      return { message: error };
    }

    if (typeof error === 'object') {
      return { ...error };
    }

    return { message: String(error) };
  }

  async log(entry: LogEntry): Promise<void> {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${entry.category.toUpperCase()}] [${entry.severity.toUpperCase()}]`;

    console.log(`${prefix} ${entry.message}`, entry.context || {});

    if (entry.error) {
      console.error('Error details:', entry.error);
    }

    try {
      await this.supabaseClient.from('logs').insert({
        severity: entry.severity,
        category: entry.category,
        message: entry.message,
        context: entry.context || {},
        error_details: entry.error ? this.extractErrorDetails(entry.error) : null,
        job_id: entry.jobId || null,
        document_id: entry.documentId || null,
        request_id: entry.requestId || this.requestId,
      });
    } catch (error) {
      console.error('Failed to write log to database:', error);
    }
  }

  debug(category: LogCategory, message: string, context?: Record<string, any>) {
    this.log({ severity: 'debug', category, message, context });
  }

  info(category: LogCategory, message: string, context?: Record<string, any>) {
    this.log({ severity: 'info', category, message, context });
  }

  warning(category: LogCategory, message: string, context?: Record<string, any>) {
    this.log({ severity: 'warning', category, message, context });
  }

  error(category: LogCategory, message: string, error?: Error | unknown, context?: Record<string, any>) {
    this.log({ severity: 'error', category, message, error, context });
  }

  critical(category: LogCategory, message: string, error?: Error | unknown, context?: Record<string, any>) {
    this.log({ severity: 'critical', category, message, error, context });
  }

  async recordPerformanceMetric(params: {
    jobId: string;
    stage: 'upload' | 'ocr' | 'llm' | 'total' | 'storage';
    provider?: string;
    startTime: Date;
    endTime?: Date;
    status: 'success' | 'failed' | 'timeout' | 'in_progress';
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const duration = params.endTime
        ? params.endTime.getTime() - params.startTime.getTime()
        : null;

      await this.supabaseClient.from('performance_metrics').insert({
        job_id: params.jobId,
        stage: params.stage,
        provider: params.provider || null,
        start_time: params.startTime.toISOString(),
        end_time: params.endTime?.toISOString() || null,
        duration_ms: duration,
        status: params.status,
        metadata: params.metadata || {},
      });

      this.debug('system', `Performance metric recorded: ${params.stage}`, {
        jobId: params.jobId,
        stage: params.stage,
        duration_ms: duration,
        status: params.status,
      });
    } catch (error) {
      console.error('Failed to record performance metric:', error);
    }
  }

  async logApiRequest(params: {
    jobId?: string;
    provider: string;
    providerType: 'ocr' | 'llm';
    endpoint: string;
    method: string;
    requestHeaders?: Record<string, string>;
    requestPayload?: any;
    responseStatus?: number;
    responseHeaders?: Record<string, string>;
    responseBody?: any;
    duration: number;
    error?: string;
  }): Promise<void> {
    try {
      const sanitizedHeaders = this.sanitizeHeaders(params.requestHeaders || {});
      const sanitizedPayload = this.sanitizePayload(params.requestPayload || {});

      await this.supabaseClient.from('api_request_logs').insert({
        job_id: params.jobId || null,
        provider: params.provider,
        provider_type: params.providerType,
        endpoint: params.endpoint,
        request_method: params.method,
        request_headers: sanitizedHeaders,
        request_payload: sanitizedPayload,
        response_status: params.responseStatus || null,
        response_headers: params.responseHeaders || {},
        response_body: this.truncateResponse(params.responseBody),
        duration_ms: params.duration,
        error: params.error || null,
      });

      this.debug('api', `API request logged: ${params.provider}`, {
        endpoint: params.endpoint,
        status: params.responseStatus,
        duration_ms: params.duration,
      });
    } catch (error) {
      console.error('Failed to log API request:', error);
    }
  }

  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized = { ...headers };
    const keysToRemove = ['authorization', 'x-api-key', 'apikey', 'api-key', 'ocp-apim-subscription-key'];

    Object.keys(sanitized).forEach(key => {
      if (keysToRemove.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private sanitizePayload(payload: any): any {
    if (typeof payload !== 'object' || payload === null) {
      return payload;
    }

    const sanitized = { ...payload };

    if (sanitized.apiKey) sanitized.apiKey = '[REDACTED]';
    if (sanitized.api_key) sanitized.api_key = '[REDACTED]';
    if (sanitized.authorization) sanitized.authorization = '[REDACTED]';

    if (typeof sanitized.image === 'string' && sanitized.image.length > 100) {
      sanitized.image = `[BASE64_IMAGE_${sanitized.image.length}_BYTES]`;
    }

    if (typeof sanitized.content === 'string' && sanitized.content.length > 1000) {
      sanitized.content = sanitized.content.substring(0, 1000) + '... [TRUNCATED]';
    }

    return sanitized;
  }

  private truncateResponse(response: any): any {
    if (!response) return null;

    const responseStr = JSON.stringify(response);
    if (responseStr.length > 10000) {
      return JSON.parse(responseStr.substring(0, 10000) + '"}');
    }

    return response;
  }
}

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

export async function updateProviderHealth(
  supabaseClient: SupabaseClient,
  providerName: string,
  providerType: 'ocr' | 'llm',
  status: 'healthy' | 'degraded' | 'down',
  responseTime?: number,
  errorMessage?: string
) {
  const { data: existing } = await supabaseClient
    .from('provider_health')
    .select('consecutive_failures')
    .eq('provider_name', providerName)
    .eq('provider_type', providerType)
    .maybeSingle();

  const consecutiveFailures = status === 'healthy'
    ? 0
    : (existing?.consecutive_failures || 0) + 1;

  await supabaseClient
    .from('provider_health')
    .upsert({
      provider_name: providerName,
      provider_type: providerType,
      status,
      last_check: new Date().toISOString(),
      response_time_ms: responseTime || null,
      error_message: errorMessage || null,
      consecutive_failures: consecutiveFailures,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'provider_name,provider_type'
    });
}
