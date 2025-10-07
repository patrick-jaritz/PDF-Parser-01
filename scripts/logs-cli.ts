#!/usr/bin/env node

import {
  queryLogs,
  getRecentLogs,
  getErrorLogs,
  getLogsByJob,
  getLogsByDocument,
  getLogsByCategory,
  getLogsBySeverity,
  getLogsInDateRange,
  searchLogs,
  getProcessingJobs,
  getFailedJobs,
  getJobWithLogs,
  getPerformanceMetrics,
  getApiRequestLogs,
  getProviderHealth,
  getErrorCatalog,
  getLogStats,
  exportLogsToJSON,
  exportLogsToCSV
} from './query-logs';

const args = process.argv.slice(2);
const command = args[0];

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
};

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

function getSeverityColor(severity: string): keyof typeof colors {
  switch (severity) {
    case 'debug': return 'gray';
    case 'info': return 'blue';
    case 'warning': return 'yellow';
    case 'error': return 'red';
    case 'critical': return 'magenta';
    default: return 'white';
  }
}

function formatLog(log: any) {
  const severityColor = getSeverityColor(log.severity);
  const timestamp = new Date(log.timestamp).toLocaleString();

  console.log(colorize('─'.repeat(80), 'gray'));
  console.log(
    `${colorize(timestamp, 'cyan')} | ` +
    `${colorize(log.severity.toUpperCase(), severityColor)} | ` +
    `${colorize(log.category.toUpperCase(), 'blue')}`
  );
  console.log(colorize(log.message, 'white'));

  if (log.job_id) {
    console.log(`  Job ID: ${colorize(log.job_id, 'cyan')}`);
  }
  if (log.document_id) {
    console.log(`  Document ID: ${colorize(log.document_id, 'cyan')}`);
  }
  if (log.request_id) {
    console.log(`  Request ID: ${colorize(log.request_id, 'cyan')}`);
  }

  if (log.context && Object.keys(log.context).length > 0) {
    console.log(colorize('  Context:', 'gray'));
    console.log(colorize('  ' + JSON.stringify(log.context, null, 2).split('\n').join('\n  '), 'gray'));
  }

  if (log.error_details) {
    console.log(colorize('  Error Details:', 'red'));
    console.log(colorize('  ' + JSON.stringify(log.error_details, null, 2).split('\n').join('\n  '), 'red'));
  }
}

function printHelp() {
  console.log(colorize('\nLog Access CLI Tool', 'bright'));
  console.log(colorize('='.repeat(80), 'gray'));
  console.log('\nUsage: npm run logs -- <command> [options]\n');

  console.log(colorize('Commands:', 'bright'));
  console.log('  recent [limit]              Show recent logs (default: 50)');
  console.log('  errors [limit]              Show error and critical logs (default: 50)');
  console.log('  job <jobId>                 Show all logs for a specific job');
  console.log('  document <docId>            Show all logs for a specific document');
  console.log('  category <category> [limit] Show logs by category (ocr, llm, upload, etc.)');
  console.log('  severity <severity> [limit] Show logs by severity (debug, info, warning, error, critical)');
  console.log('  search <term> [limit]       Search logs by message content');
  console.log('  jobs [status] [limit]       Show processing jobs (optional status filter)');
  console.log('  failed-jobs [limit]         Show failed processing jobs');
  console.log('  job-details <jobId>         Show job details with all associated logs');
  console.log('  metrics <jobId>             Show performance metrics for a job');
  console.log('  api-logs [jobId] [provider] Show API request logs');
  console.log('  health                      Show provider health status');
  console.log('  error-catalog               Show error catalog');
  console.log('  stats                       Show log statistics');
  console.log('  export-json [filename]      Export logs to JSON file');
  console.log('  export-csv [filename]       Export logs to CSV file');
  console.log('  help                        Show this help message');

  console.log(colorize('\nExamples:', 'bright'));
  console.log('  npm run logs -- recent 100');
  console.log('  npm run logs -- errors');
  console.log('  npm run logs -- job 123e4567-e89b-12d3-a456-426614174000');
  console.log('  npm run logs -- category ocr 30');
  console.log('  npm run logs -- severity error');
  console.log('  npm run logs -- search "API key"');
  console.log('  npm run logs -- export-json logs-export.json');
  console.log('');
}

async function main() {
  try {
    if (!command || command === 'help') {
      printHelp();
      return;
    }

    switch (command) {
      case 'recent': {
        const limit = parseInt(args[1]) || 50;
        console.log(colorize(`\nFetching ${limit} most recent logs...`, 'bright'));
        const logs = await getRecentLogs(limit);
        console.log(colorize(`\nFound ${logs.length} logs\n`, 'green'));
        logs.forEach(formatLog);
        break;
      }

      case 'errors': {
        const limit = parseInt(args[1]) || 50;
        console.log(colorize(`\nFetching error and critical logs...`, 'bright'));
        const logs = await getErrorLogs(limit);
        console.log(colorize(`\nFound ${logs.length} error logs\n`, 'red'));
        logs.forEach(formatLog);
        break;
      }

      case 'job': {
        const jobId = args[1];
        if (!jobId) {
          console.error(colorize('Error: Job ID required', 'red'));
          process.exit(1);
        }
        console.log(colorize(`\nFetching logs for job ${jobId}...`, 'bright'));
        const logs = await getLogsByJob(jobId);
        console.log(colorize(`\nFound ${logs.length} logs\n`, 'green'));
        logs.forEach(formatLog);
        break;
      }

      case 'document': {
        const docId = args[1];
        if (!docId) {
          console.error(colorize('Error: Document ID required', 'red'));
          process.exit(1);
        }
        console.log(colorize(`\nFetching logs for document ${docId}...`, 'bright'));
        const logs = await getLogsByDocument(docId);
        console.log(colorize(`\nFound ${logs.length} logs\n`, 'green'));
        logs.forEach(formatLog);
        break;
      }

      case 'category': {
        const category = args[1] as any;
        const limit = parseInt(args[2]) || 50;
        if (!category) {
          console.error(colorize('Error: Category required (ocr, llm, upload, database, api, system, auth, storage)', 'red'));
          process.exit(1);
        }
        console.log(colorize(`\nFetching ${category} logs...`, 'bright'));
        const logs = await getLogsByCategory(category, limit);
        console.log(colorize(`\nFound ${logs.length} logs\n`, 'green'));
        logs.forEach(formatLog);
        break;
      }

      case 'severity': {
        const severity = args[1] as any;
        const limit = parseInt(args[2]) || 50;
        if (!severity) {
          console.error(colorize('Error: Severity required (debug, info, warning, error, critical)', 'red'));
          process.exit(1);
        }
        console.log(colorize(`\nFetching ${severity} logs...`, 'bright'));
        const logs = await getLogsBySeverity(severity, limit);
        console.log(colorize(`\nFound ${logs.length} logs\n`, 'green'));
        logs.forEach(formatLog);
        break;
      }

      case 'search': {
        const searchTerm = args[1];
        const limit = parseInt(args[2]) || 50;
        if (!searchTerm) {
          console.error(colorize('Error: Search term required', 'red'));
          process.exit(1);
        }
        console.log(colorize(`\nSearching for "${searchTerm}"...`, 'bright'));
        const logs = await searchLogs(searchTerm, limit);
        console.log(colorize(`\nFound ${logs.length} matching logs\n`, 'green'));
        logs.forEach(formatLog);
        break;
      }

      case 'jobs': {
        const status = args[1];
        const limit = parseInt(args[2]) || 50;
        console.log(colorize('\nFetching processing jobs...', 'bright'));
        const jobs = await getProcessingJobs({ status, limit });
        console.log(colorize(`\nFound ${jobs.length} jobs\n`, 'green'));
        jobs.forEach(job => {
          console.log(colorize('─'.repeat(80), 'gray'));
          console.log(`ID: ${colorize(job.id, 'cyan')}`);
          console.log(`Status: ${colorize(job.status, job.status === 'completed' ? 'green' : job.status === 'failed' ? 'red' : 'yellow')}`);
          console.log(`Document ID: ${colorize(job.document_id, 'cyan')}`);
          console.log(`OCR Provider: ${job.ocr_provider}`);
          console.log(`LLM Provider: ${job.llm_provider}`);
          if (job.processing_time_ms) {
            console.log(`Processing Time: ${job.processing_time_ms}ms`);
          }
          if (job.error_message) {
            console.log(colorize(`Error: ${job.error_message}`, 'red'));
          }
          console.log(`Created: ${new Date(job.created_at).toLocaleString()}`);
        });
        break;
      }

      case 'failed-jobs': {
        const limit = parseInt(args[1]) || 50;
        console.log(colorize('\nFetching failed jobs...', 'bright'));
        const jobs = await getFailedJobs(limit);
        console.log(colorize(`\nFound ${jobs.length} failed jobs\n`, 'red'));
        jobs.forEach(job => {
          console.log(colorize('─'.repeat(80), 'gray'));
          console.log(`ID: ${colorize(job.id, 'cyan')}`);
          console.log(`Document ID: ${colorize(job.document_id, 'cyan')}`);
          console.log(`OCR Provider: ${job.ocr_provider}`);
          console.log(`LLM Provider: ${job.llm_provider}`);
          console.log(colorize(`Error: ${job.error_message}`, 'red'));
          if (job.error_details) {
            console.log(colorize('Error Details:', 'red'));
            console.log(colorize(JSON.stringify(job.error_details, null, 2), 'red'));
          }
          console.log(`Created: ${new Date(job.created_at).toLocaleString()}`);
        });
        break;
      }

      case 'job-details': {
        const jobId = args[1];
        if (!jobId) {
          console.error(colorize('Error: Job ID required', 'red'));
          process.exit(1);
        }
        console.log(colorize(`\nFetching details for job ${jobId}...`, 'bright'));
        const { job, logs } = await getJobWithLogs(jobId);

        console.log(colorize('\n=== JOB DETAILS ===\n', 'bright'));
        console.log(`ID: ${colorize(job.id, 'cyan')}`);
        console.log(`Status: ${colorize(job.status, job.status === 'completed' ? 'green' : job.status === 'failed' ? 'red' : 'yellow')}`);
        console.log(`Document ID: ${colorize(job.document_id, 'cyan')}`);
        console.log(`OCR Provider: ${job.ocr_provider}`);
        console.log(`LLM Provider: ${job.llm_provider}`);
        if (job.processing_time_ms) {
          console.log(`Processing Time: ${job.processing_time_ms}ms`);
        }
        if (job.error_message) {
          console.log(colorize(`Error: ${job.error_message}`, 'red'));
        }
        console.log(`Created: ${new Date(job.created_at).toLocaleString()}`);

        console.log(colorize(`\n=== LOGS (${logs.length}) ===\n`, 'bright'));
        logs.forEach(formatLog);
        break;
      }

      case 'metrics': {
        const jobId = args[1];
        if (!jobId) {
          console.error(colorize('Error: Job ID required', 'red'));
          process.exit(1);
        }
        console.log(colorize(`\nFetching performance metrics for job ${jobId}...`, 'bright'));
        const metrics = await getPerformanceMetrics(jobId);
        console.log(colorize(`\nFound ${metrics.length} metrics\n`, 'green'));
        metrics.forEach(metric => {
          console.log(colorize('─'.repeat(80), 'gray'));
          console.log(`Stage: ${colorize(metric.stage.toUpperCase(), 'cyan')}`);
          if (metric.provider) {
            console.log(`Provider: ${metric.provider}`);
          }
          console.log(`Status: ${colorize(metric.status, metric.status === 'success' ? 'green' : 'red')}`);
          if (metric.duration_ms) {
            console.log(`Duration: ${metric.duration_ms}ms`);
          }
          console.log(`Start: ${new Date(metric.start_time).toLocaleString()}`);
          if (metric.end_time) {
            console.log(`End: ${new Date(metric.end_time).toLocaleString()}`);
          }
          if (metric.metadata && Object.keys(metric.metadata).length > 0) {
            console.log('Metadata:', JSON.stringify(metric.metadata, null, 2));
          }
        });
        break;
      }

      case 'api-logs': {
        const jobId = args[1];
        const provider = args[2];
        console.log(colorize('\nFetching API request logs...', 'bright'));
        const logs = await getApiRequestLogs(jobId, provider);
        console.log(colorize(`\nFound ${logs.length} API request logs\n`, 'green'));
        logs.forEach(log => {
          console.log(colorize('─'.repeat(80), 'gray'));
          console.log(`Provider: ${colorize(log.provider, 'cyan')} (${log.provider_type})`);
          console.log(`Endpoint: ${log.endpoint}`);
          console.log(`Method: ${log.request_method}`);
          if (log.response_status) {
            const statusColor = log.response_status >= 200 && log.response_status < 300 ? 'green' : 'red';
            console.log(`Status: ${colorize(log.response_status.toString(), statusColor)}`);
          }
          if (log.duration_ms) {
            console.log(`Duration: ${log.duration_ms}ms`);
          }
          if (log.error) {
            console.log(colorize(`Error: ${log.error}`, 'red'));
          }
          console.log(`Timestamp: ${new Date(log.timestamp).toLocaleString()}`);
        });
        break;
      }

      case 'health': {
        console.log(colorize('\nFetching provider health status...', 'bright'));
        const health = await getProviderHealth();
        console.log(colorize(`\nProvider Health Status (${health.length} providers)\n`, 'green'));
        health.forEach(provider => {
          const statusColor = provider.status === 'healthy' ? 'green' :
                            provider.status === 'degraded' ? 'yellow' :
                            provider.status === 'down' ? 'red' : 'gray';
          console.log(colorize('─'.repeat(80), 'gray'));
          console.log(`${colorize(provider.provider_name, 'cyan')} (${provider.provider_type.toUpperCase()})`);
          console.log(`Status: ${colorize(provider.status.toUpperCase(), statusColor)}`);
          if (provider.response_time_ms) {
            console.log(`Response Time: ${provider.response_time_ms}ms`);
          }
          if (provider.consecutive_failures > 0) {
            console.log(colorize(`Consecutive Failures: ${provider.consecutive_failures}`, 'red'));
          }
          if (provider.error_message) {
            console.log(colorize(`Error: ${provider.error_message}`, 'red'));
          }
          console.log(`Last Check: ${new Date(provider.last_check).toLocaleString()}`);
        });
        break;
      }

      case 'error-catalog': {
        console.log(colorize('\nFetching error catalog...', 'bright'));
        const catalog = await getErrorCatalog();
        console.log(colorize(`\nError Catalog (${catalog.length} errors)\n`, 'green'));
        catalog.forEach(error => {
          console.log(colorize('─'.repeat(80), 'gray'));
          console.log(colorize(`${error.error_code}`, 'cyan'));
          console.log(colorize(error.title, 'bright'));
          console.log(`Category: ${error.category} | Severity: ${colorize(error.severity, getSeverityColor(error.severity))}`);
          console.log(`Description: ${error.description}`);
          console.log(colorize(`Solution: ${error.solution}`, 'green'));
          if (error.documentation_url) {
            console.log(`Docs: ${error.documentation_url}`);
          }
        });
        break;
      }

      case 'stats': {
        console.log(colorize('\nFetching log statistics...', 'bright'));
        const stats = await getLogStats();
        console.log(colorize('\n=== LOG STATISTICS ===\n', 'bright'));
        console.log(`Total Logs: ${colorize(stats.total.toString(), 'cyan')}`);

        console.log(colorize('\nBy Severity:', 'bright'));
        Object.entries(stats.bySeverity).forEach(([severity, count]) => {
          const color = getSeverityColor(severity);
          console.log(`  ${colorize(severity.padEnd(10), color)}: ${count}`);
        });

        console.log(colorize('\nBy Category:', 'bright'));
        Object.entries(stats.byCategory).forEach(([category, count]) => {
          console.log(`  ${colorize(category.padEnd(10), 'blue')}: ${count}`);
        });
        break;
      }

      case 'export-json': {
        const filename = args[1] || `logs-export-${Date.now()}.json`;
        console.log(colorize(`\nExporting logs to ${filename}...`, 'bright'));
        await exportLogsToJSON({}, filename);
        console.log(colorize(`\nExported successfully to ${filename}`, 'green'));
        break;
      }

      case 'export-csv': {
        const filename = args[1] || `logs-export-${Date.now()}.csv`;
        console.log(colorize(`\nExporting logs to ${filename}...`, 'bright'));
        await exportLogsToCSV({}, filename);
        console.log(colorize(`\nExported successfully to ${filename}`, 'green'));
        break;
      }

      default:
        console.error(colorize(`\nUnknown command: ${command}`, 'red'));
        printHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error(colorize('\nError:', 'red'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
