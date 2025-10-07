import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/database.types';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

type LogSeverity = 'debug' | 'info' | 'warning' | 'error' | 'critical';
type LogCategory = 'ocr' | 'llm' | 'upload' | 'database' | 'api' | 'system' | 'auth' | 'storage';

interface QueryOptions {
  severity?: LogSeverity | LogSeverity[];
  category?: LogCategory | LogCategory[];
  limit?: number;
  startDate?: Date;
  endDate?: Date;
  jobId?: string;
  documentId?: string;
  userId?: string;
  requestId?: string;
  searchTerm?: string;
}

export async function queryLogs(options: QueryOptions = {}) {
  let query = supabase
    .from('logs')
    .select('*')
    .order('timestamp', { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.severity) {
    const severities = Array.isArray(options.severity) ? options.severity : [options.severity];
    query = query.in('severity', severities);
  }

  if (options.category) {
    const categories = Array.isArray(options.category) ? options.category : [options.category];
    query = query.in('category', categories);
  }

  if (options.startDate) {
    query = query.gte('timestamp', options.startDate.toISOString());
  }

  if (options.endDate) {
    query = query.lte('timestamp', options.endDate.toISOString());
  }

  if (options.jobId) {
    query = query.eq('job_id', options.jobId);
  }

  if (options.documentId) {
    query = query.eq('document_id', options.documentId);
  }

  if (options.userId) {
    query = query.eq('user_id', options.userId);
  }

  if (options.requestId) {
    query = query.eq('request_id', options.requestId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to query logs: ${error.message}`);
  }

  let results = data || [];

  if (options.searchTerm && results.length > 0) {
    const searchLower = options.searchTerm.toLowerCase();
    results = results.filter(log =>
      log.message.toLowerCase().includes(searchLower) ||
      JSON.stringify(log.context).toLowerCase().includes(searchLower) ||
      JSON.stringify(log.error_details).toLowerCase().includes(searchLower)
    );
  }

  return results;
}

export async function getRecentLogs(limit: number = 50) {
  return queryLogs({ limit });
}

export async function getErrorLogs(limit: number = 50) {
  return queryLogs({
    severity: ['error', 'critical'],
    limit
  });
}

export async function getLogsByJob(jobId: string) {
  return queryLogs({ jobId });
}

export async function getLogsByDocument(documentId: string) {
  return queryLogs({ documentId });
}

export async function getLogsByCategory(category: LogCategory, limit: number = 50) {
  return queryLogs({ category, limit });
}

export async function getLogsBySeverity(severity: LogSeverity, limit: number = 50) {
  return queryLogs({ severity, limit });
}

export async function getLogsInDateRange(startDate: Date, endDate: Date) {
  return queryLogs({ startDate, endDate });
}

export async function searchLogs(searchTerm: string, limit: number = 50) {
  return queryLogs({ searchTerm, limit });
}

export async function getProcessingJobs(options: {
  status?: string;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
} = {}) {
  let query = supabase
    .from('processing_jobs')
    .select('*')
    .order('created_at', { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.status) {
    query = query.eq('status', options.status);
  }

  if (options.startDate) {
    query = query.gte('created_at', options.startDate.toISOString());
  }

  if (options.endDate) {
    query = query.lte('created_at', options.endDate.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to query processing jobs: ${error.message}`);
  }

  return data || [];
}

export async function getFailedJobs(limit: number = 50) {
  return getProcessingJobs({ status: 'failed', limit });
}

export async function getJobWithLogs(jobId: string) {
  const [job, logs] = await Promise.all([
    supabase.from('processing_jobs').select('*').eq('id', jobId).single(),
    queryLogs({ jobId })
  ]);

  if (job.error) {
    throw new Error(`Failed to get job: ${job.error.message}`);
  }

  return {
    job: job.data,
    logs
  };
}

export async function getPerformanceMetrics(jobId: string) {
  const { data, error } = await supabase
    .from('performance_metrics')
    .select('*')
    .eq('job_id', jobId)
    .order('start_time', { ascending: true });

  if (error) {
    throw new Error(`Failed to get performance metrics: ${error.message}`);
  }

  return data || [];
}

export async function getApiRequestLogs(jobId?: string, provider?: string) {
  let query = supabase
    .from('api_request_logs')
    .select('*')
    .order('timestamp', { ascending: false });

  if (jobId) {
    query = query.eq('job_id', jobId);
  }

  if (provider) {
    query = query.eq('provider', provider);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get API request logs: ${error.message}`);
  }

  return data || [];
}

export async function getProviderHealth() {
  const { data, error } = await supabase
    .from('provider_health')
    .select('*')
    .order('provider_name', { ascending: true });

  if (error) {
    throw new Error(`Failed to get provider health: ${error.message}`);
  }

  return data || [];
}

export async function getErrorCatalog() {
  const { data, error } = await supabase
    .from('error_catalog')
    .select('*')
    .order('error_code', { ascending: true });

  if (error) {
    throw new Error(`Failed to get error catalog: ${error.message}`);
  }

  return data || [];
}

export async function getLogStats() {
  const { data: logs } = await supabase
    .from('logs')
    .select('severity, category');

  if (!logs) {
    return {
      total: 0,
      bySeverity: {},
      byCategory: {}
    };
  }

  const stats = {
    total: logs.length,
    bySeverity: {} as Record<string, number>,
    byCategory: {} as Record<string, number>
  };

  logs.forEach(log => {
    stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1;
    stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
  });

  return stats;
}

export async function exportLogsToJSON(options: QueryOptions = {}, filename?: string) {
  const logs = await queryLogs(options);
  const json = JSON.stringify(logs, null, 2);

  if (filename) {
    const fs = await import('fs');
    fs.writeFileSync(filename, json);
    return filename;
  }

  return json;
}

export async function exportLogsToCSV(options: QueryOptions = {}, filename?: string) {
  const logs = await queryLogs(options);

  if (logs.length === 0) {
    return '';
  }

  const headers = ['timestamp', 'severity', 'category', 'message', 'job_id', 'document_id', 'user_id', 'request_id'];
  const csvLines = [
    headers.join(','),
    ...logs.map(log => [
      log.timestamp,
      log.severity,
      log.category,
      `"${log.message.replace(/"/g, '""')}"`,
      log.job_id || '',
      log.document_id || '',
      log.user_id || '',
      log.request_id || ''
    ].join(','))
  ];

  const csv = csvLines.join('\n');

  if (filename) {
    const fs = await import('fs');
    fs.writeFileSync(filename, csv);
    return filename;
  }

  return csv;
}
