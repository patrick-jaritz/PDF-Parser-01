import { supabase } from './supabase';
import type { Database } from './database.types';
import { offlineLogStorage } from './offlineLogStorage';

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

interface PerformanceMetricEntry {
  jobId: string;
  stage: 'upload' | 'ocr' | 'llm' | 'total' | 'storage';
  provider?: string;
  startTime: Date;
  endTime?: Date;
  status: 'success' | 'failed' | 'timeout' | 'in_progress';
  metadata?: Record<string, any>;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private consoleLogs: boolean = true;

  private getColorForSeverity(severity: LogSeverity): string {
    const colors = {
      debug: '#6B7280',
      info: '#3B82F6',
      warning: '#F59E0B',
      error: '#EF4444',
      critical: '#DC2626',
    };
    return colors[severity];
  }

  private logToConsole(entry: LogEntry) {
    if (!this.consoleLogs || !this.isDevelopment) return;

    const color = this.getColorForSeverity(entry.severity);
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${entry.category.toUpperCase()}] [${entry.severity.toUpperCase()}]`;

    console.log(
      `%c${prefix} ${entry.message}`,
      `color: ${color}; font-weight: bold;`
    );

    if (entry.context && Object.keys(entry.context).length > 0) {
      console.log('%cContext:', 'color: #6B7280; font-weight: bold;', entry.context);
    }

    if (entry.error) {
      console.error('%cError:', 'color: #EF4444; font-weight: bold;', entry.error);
    }
  }

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
    this.logToConsole(entry);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const logData = {
        severity: entry.severity,
        category: entry.category,
        message: entry.message,
        context: entry.context || {},
        error_details: entry.error ? this.extractErrorDetails(entry.error) : null,
        user_id: user?.id || null,
        job_id: entry.jobId || null,
        document_id: entry.documentId || null,
        request_id: entry.requestId || null,
        timestamp: new Date().toISOString(),
      };

      const { error: dbError } = await supabase.from('logs').insert(logData);

      if (dbError) {
        await offlineLogStorage.addLog(logData);
      }
    } catch (error) {
      try {
        await offlineLogStorage.addLog({
          severity: entry.severity,
          category: entry.category,
          message: entry.message,
          context: entry.context || {},
          error_details: entry.error ? this.extractErrorDetails(entry.error) : null,
          job_id: entry.jobId || null,
          document_id: entry.documentId || null,
          request_id: entry.requestId || null,
          timestamp: new Date().toISOString(),
        });
      } catch (offlineError) {
        console.error('Failed to write log to database and offline storage:', offlineError);
      }
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

  async recordPerformanceMetric(metric: PerformanceMetricEntry): Promise<void> {
    try {
      const duration = metric.endTime
        ? metric.endTime.getTime() - metric.startTime.getTime()
        : null;

      await supabase.from('performance_metrics').insert({
        job_id: metric.jobId,
        stage: metric.stage,
        provider: metric.provider || null,
        start_time: metric.startTime.toISOString(),
        end_time: metric.endTime?.toISOString() || null,
        duration_ms: duration,
        status: metric.status,
        metadata: metric.metadata || {},
      });

      this.debug('system', `Performance metric recorded: ${metric.stage}`, {
        jobId: metric.jobId,
        stage: metric.stage,
        duration_ms: duration,
        status: metric.status,
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

      await supabase.from('api_request_logs').insert({
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
    const keysToRemove = ['authorization', 'x-api-key', 'apikey', 'api-key'];

    keysToRemove.forEach(key => {
      if (sanitized[key] || sanitized[key.toLowerCase()]) {
        delete sanitized[key];
        delete sanitized[key.toLowerCase()];
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

  setConsoleLogging(enabled: boolean) {
    this.consoleLogs = enabled;
  }
}

export const logger = new Logger();

export async function getRecentLogs(limit: number = 100, filters?: {
  severity?: LogSeverity;
  category?: LogCategory;
  jobId?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  let query = supabase
    .from('logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (filters?.severity) {
    query = query.eq('severity', filters.severity);
  }

  if (filters?.category) {
    query = query.eq('category', filters.category);
  }

  if (filters?.jobId) {
    query = query.eq('job_id', filters.jobId);
  }

  if (filters?.startDate) {
    query = query.gte('timestamp', filters.startDate.toISOString());
  }

  if (filters?.endDate) {
    query = query.lte('timestamp', filters.endDate.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    logger.error('database', 'Failed to fetch logs', error);
    return [];
  }

  return data || [];
}

export async function getPerformanceMetrics(jobId: string) {
  const { data, error } = await supabase
    .from('performance_metrics')
    .select('*')
    .eq('job_id', jobId)
    .order('start_time', { ascending: true });

  if (error) {
    logger.error('database', 'Failed to fetch performance metrics', error);
    return [];
  }

  return data || [];
}

export async function getApiRequestLogs(jobId: string) {
  const { data, error } = await supabase
    .from('api_request_logs')
    .select('*')
    .eq('job_id', jobId)
    .order('timestamp', { ascending: true });

  if (error) {
    logger.error('database', 'Failed to fetch API request logs', error);
    return [];
  }

  return data || [];
}

export async function getErrorCatalog() {
  const { data, error } = await supabase
    .from('error_catalog')
    .select('*')
    .order('error_code', { ascending: true });

  if (error) {
    logger.error('database', 'Failed to fetch error catalog', error);
    return [];
  }

  return data || [];
}

export async function getProviderHealth() {
  const { data, error } = await supabase
    .from('provider_health')
    .select('*')
    .order('provider_name', { ascending: true });

  if (error) {
    logger.error('database', 'Failed to fetch provider health', error);
    return [];
  }

  return data || [];
}

export async function updateProviderHealth(
  providerName: string,
  providerType: 'ocr' | 'llm',
  status: 'healthy' | 'degraded' | 'down',
  responseTime?: number,
  errorMessage?: string
) {
  const { data: existing } = await supabase
    .from('provider_health')
    .select('consecutive_failures')
    .eq('provider_name', providerName)
    .eq('provider_type', providerType)
    .maybeSingle();

  const consecutiveFailures = status === 'healthy'
    ? 0
    : (existing?.consecutive_failures || 0) + 1;

  const { error } = await supabase
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

  if (error) {
    logger.error('database', 'Failed to update provider health', error);
  }
}
