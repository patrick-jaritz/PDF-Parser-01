# Log Access Scripts

This directory contains tools for accessing and analyzing application logs stored in the Supabase database.

## Overview

The log access system provides multiple ways to view and analyze logs:
- **CLI Tool** - Command-line interface for quick log queries
- **Real-time Monitor** - Watch logs as they are created
- **Query API** - Programmatic access to logs from scripts
- **Web Dashboard** - Enhanced AdminLogs page with advanced filtering

## Prerequisites

Make sure you have the required environment variables set in your `.env` file:
```bash
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Installation

Install required dependencies:
```bash
npm install
```

## CLI Tool Usage

### Basic Commands

View recent logs:
```bash
npm run logs:recent
npm run logs -- recent 100  # Specify limit
```

View errors only:
```bash
npm run logs:errors
```

View log statistics:
```bash
npm run logs:stats
```

Check provider health:
```bash
npm run logs:health
```

View all jobs:
```bash
npm run logs:jobs
npm run logs -- jobs failed 50  # With status filter
```

View failed jobs:
```bash
npm run logs:failed
```

### Advanced Filtering

Filter by severity:
```bash
npm run logs -- severity error
npm run logs -- severity critical 30
```

Filter by category:
```bash
npm run logs -- category ocr
npm run logs -- category llm 50
```

Search logs:
```bash
npm run logs -- search "API key"
npm run logs -- search "timeout" 100
```

### Job-Specific Queries

View logs for a specific job:
```bash
npm run logs -- job 123e4567-e89b-12d3-a456-426614174000
```

View job details with all logs:
```bash
npm run logs -- job-details 123e4567-e89b-12d3-a456-426614174000
```

View performance metrics for a job:
```bash
npm run logs -- metrics 123e4567-e89b-12d3-a456-426614174000
```

View document logs:
```bash
npm run logs -- document doc-id-here
```

### API Request Logs

View all API requests:
```bash
npm run logs -- api-logs
```

Filter by job:
```bash
npm run logs -- api-logs job-id-here
```

Filter by provider:
```bash
npm run logs -- api-logs "" google-vision
```

### Error Catalog

View predefined error catalog with solutions:
```bash
npm run logs -- error-catalog
```

### Export Logs

Export to JSON:
```bash
npm run logs:export
npm run logs -- export-json custom-filename.json
```

Export to CSV:
```bash
npm run logs -- export-csv logs-export.csv
```

## Real-time Log Monitoring

Watch logs in real-time (updates every 2 seconds):
```bash
npm run logs:watch
```

Press `Ctrl+C` to stop monitoring.

## Programmatic Access

You can import and use the query functions in your own scripts:

```typescript
import {
  queryLogs,
  getRecentLogs,
  getErrorLogs,
  getLogsByJob,
  getJobWithLogs,
  getPerformanceMetrics,
  getProviderHealth
} from './scripts/query-logs';

// Get recent error logs
const errors = await getErrorLogs(50);

// Get all logs for a specific job
const jobLogs = await getLogsByJob('job-id-here');

// Query with custom filters
const customLogs = await queryLogs({
  severity: ['error', 'critical'],
  category: 'ocr',
  limit: 100,
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31')
});

// Get job details with logs
const { job, logs } = await getJobWithLogs('job-id-here');

// Get performance metrics
const metrics = await getPerformanceMetrics('job-id-here');

// Get provider health status
const health = await getProviderHealth();
```

## Utility Functions

Additional utility functions for analysis:

```typescript
import {
  findSlowProcessingJobs,
  analyzeErrorPatterns,
  getProviderErrorRates,
  getRecentFailures,
  getJobTimeline,
  generateDailyReport
} from './scripts/log-utils';

// Find jobs taking longer than 30 seconds
const slowJobs = await findSlowProcessingJobs(30000);

// Analyze common error patterns
const patterns = await analyzeErrorPatterns(100);

// Get error rates by provider
const errorRates = await getProviderErrorRates();

// Get failures in last 24 hours
const failures = await getRecentFailures(24);

// Get complete timeline for a job
const timeline = await getJobTimeline('job-id-here');

// Generate daily summary report
const report = await generateDailyReport();
```

## Web Dashboard

The AdminLogs page (`/admin/logs`) has been enhanced with:

- **Severity Filter** - Filter by debug, info, warning, error, critical
- **Category Filter** - Filter by OCR, LLM, upload, database, API, system, auth, storage
- **Date Range Filter** - Filter logs by start and end date/time
- **Job ID Filter** - View all logs for a specific job
- **Document ID Filter** - View all logs for a specific document
- **User ID Filter** - View all logs by a specific user
- **Text Search** - Search log messages, context, and error details
- **Export to CSV** - Export filtered logs to CSV file
- **Clear Filters** - Reset all filters at once
- **Expandable Logs** - Click to expand and view full context and error details

## Log Structure

Logs include the following information:

- **timestamp** - When the log was created
- **severity** - debug | info | warning | error | critical
- **category** - ocr | llm | upload | database | api | system | auth | storage
- **message** - Human-readable log message
- **context** - Additional structured data (JSONB)
- **error_details** - Detailed error information including stack traces (JSONB)
- **user_id** - Associated user (if any)
- **job_id** - Associated processing job (if any)
- **document_id** - Associated document (if any)
- **request_id** - Request ID for tracing across services

## Performance Metrics

Performance metrics track:
- **stage** - upload | ocr | llm | total | storage
- **provider** - Provider used (e.g., google-vision, openai)
- **start_time** - When the stage started
- **end_time** - When the stage completed
- **duration_ms** - Processing duration in milliseconds
- **status** - success | failed | timeout | in_progress
- **metadata** - Additional metrics (tokens, pages, confidence, etc.)

## API Request Logs

API request logs capture:
- **provider** - API provider name
- **provider_type** - ocr | llm
- **endpoint** - API endpoint called
- **request_method** - HTTP method
- **request_headers** - Sanitized request headers (no API keys)
- **request_payload** - Sanitized request payload
- **response_status** - HTTP status code
- **response_body** - Response body (truncated if large)
- **duration_ms** - Request duration
- **error** - Error message if request failed

## Provider Health

Provider health tracks:
- **provider_name** - Name of the provider
- **provider_type** - ocr | llm
- **status** - healthy | degraded | down | unknown
- **last_check** - Last health check timestamp
- **response_time_ms** - Response time in milliseconds
- **consecutive_failures** - Number of consecutive failures
- **error_message** - Error message if unhealthy

## Error Catalog

The error catalog provides:
- **error_code** - Unique error code (e.g., OCR_API_KEY_MISSING)
- **category** - configuration | network | provider | validation | system
- **severity** - warning | error | critical
- **title** - Short error title
- **description** - Detailed description
- **solution** - How to resolve the error
- **documentation_url** - Link to relevant docs

## Common Use Cases

### Debugging a Failed Job

```bash
# 1. Find the job in failed jobs list
npm run logs:failed

# 2. Get detailed job information with logs
npm run logs -- job-details <job-id>

# 3. Check performance metrics
npm run logs -- metrics <job-id>

# 4. View API request logs
npm run logs -- api-logs <job-id>
```

### Monitoring Provider Issues

```bash
# Check provider health
npm run logs:health

# View errors by category
npm run logs -- category ocr
npm run logs -- category llm

# Check API logs for specific provider
npm run logs -- api-logs "" google-vision
```

### Analyzing Performance

```bash
# View job statistics
npm run logs:jobs

# Check log stats
npm run logs:stats

# Generate daily report (programmatic)
# See log-utils.ts generateDailyReport()
```

### Investigating Errors

```bash
# View all errors
npm run logs:errors

# Search for specific error
npm run logs -- search "timeout"
npm run logs -- search "API key"

# View error catalog for solutions
npm run logs -- error-catalog
```

## Tips

1. **Use date filters** for investigating issues in specific time periods
2. **Export logs** before applying new filters to preserve results
3. **Use job IDs** to trace complete processing pipelines
4. **Monitor in real-time** during testing to catch issues immediately
5. **Check provider health** regularly to identify API issues early
6. **Review error catalog** for common problems and solutions

## Troubleshooting

### "Failed to query logs" error

Make sure your Supabase credentials are correctly set in `.env`:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### No logs appearing

1. Check that the application is logging events
2. Verify RLS policies allow your user to view logs
3. Check that logs table exists in Supabase

### CLI command not found

Make sure you've installed dependencies:
```bash
npm install
```

### Real-time monitor not updating

The monitor polls every 2 seconds. If no new logs are created, nothing will appear.

## Support

For issues or questions, check:
- Error catalog: `npm run logs -- error-catalog`
- Provider health: `npm run logs:health`
- Recent errors: `npm run logs:errors`
