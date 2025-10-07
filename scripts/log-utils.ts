import { queryLogs, getProcessingJobs } from './query-logs';

export async function findSlowProcessingJobs(thresholdMs: number = 30000) {
  const jobs = await getProcessingJobs({ status: 'completed' });

  return jobs
    .filter(job => job.processing_time_ms && job.processing_time_ms > thresholdMs)
    .sort((a, b) => (b.processing_time_ms || 0) - (a.processing_time_ms || 0));
}

export async function analyzeErrorPatterns(limit: number = 100) {
  const errorLogs = await queryLogs({
    severity: ['error', 'critical'],
    limit
  });

  const patterns: Record<string, { count: number; examples: string[] }> = {};

  errorLogs.forEach(log => {
    const key = `${log.category}:${log.severity}`;
    if (!patterns[key]) {
      patterns[key] = { count: 0, examples: [] };
    }
    patterns[key].count++;
    if (patterns[key].examples.length < 3) {
      patterns[key].examples.push(log.message);
    }
  });

  return Object.entries(patterns)
    .map(([key, data]) => ({ pattern: key, ...data }))
    .sort((a, b) => b.count - a.count);
}

export async function getProviderErrorRates() {
  const jobs = await getProcessingJobs({});

  const providerStats: Record<string, { total: number; failed: number }> = {};

  jobs.forEach(job => {
    const provider = job.ocr_provider;
    if (!providerStats[provider]) {
      providerStats[provider] = { total: 0, failed: 0 };
    }
    providerStats[provider].total++;
    if (job.status === 'failed') {
      providerStats[provider].failed++;
    }
  });

  return Object.entries(providerStats).map(([provider, stats]) => ({
    provider,
    total: stats.total,
    failed: stats.failed,
    errorRate: stats.total > 0 ? (stats.failed / stats.total) * 100 : 0
  })).sort((a, b) => b.errorRate - a.errorRate);
}

export async function getRecentFailures(hours: number = 24) {
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - hours);

  const logs = await queryLogs({
    severity: ['error', 'critical'],
    startDate
  });

  return logs;
}

export async function getJobTimeline(jobId: string) {
  const logs = await queryLogs({ jobId });

  const timeline = logs
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map(log => ({
      timestamp: log.timestamp,
      event: log.message,
      category: log.category,
      severity: log.severity,
      context: log.context,
      error: log.error_details
    }));

  return timeline;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${(ms / 60000).toFixed(2)}m`;
}

export function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}

export async function generateDailyReport() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [logs, jobs] = await Promise.all([
    queryLogs({ startDate: today }),
    getProcessingJobs({ startDate: today })
  ]);

  const errorLogs = logs.filter(log => log.severity === 'error' || log.severity === 'critical');
  const completedJobs = jobs.filter(job => job.status === 'completed');
  const failedJobs = jobs.filter(job => job.status === 'failed');

  const avgProcessingTime = completedJobs.length > 0
    ? completedJobs.reduce((sum, job) => sum + (job.processing_time_ms || 0), 0) / completedJobs.length
    : 0;

  return {
    date: today.toISOString().split('T')[0],
    summary: {
      totalLogs: logs.length,
      errorLogs: errorLogs.length,
      totalJobs: jobs.length,
      completedJobs: completedJobs.length,
      failedJobs: failedJobs.length,
      successRate: jobs.length > 0 ? (completedJobs.length / jobs.length) * 100 : 0,
      avgProcessingTime: Math.round(avgProcessingTime)
    },
    topErrors: await analyzeErrorPatterns(50),
    slowestJobs: await findSlowProcessingJobs(30000)
  };
}
