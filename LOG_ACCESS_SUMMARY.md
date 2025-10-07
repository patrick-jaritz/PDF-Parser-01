# Log Access Implementation Summary

## Overview

Successfully implemented comprehensive log access mechanisms for the PDF OCR and Structured Data Extraction application. You now have multiple ways to access and analyze all file processing logs stored in the Supabase database.

## What Was Implemented

### 1. Database Query Library (`scripts/query-logs.ts`)
- Direct Supabase database access functions
- Query logs with multiple filter options (severity, category, date range, job ID, etc.)
- Retrieve processing jobs, performance metrics, API logs, provider health
- Export logs to JSON and CSV formats
- Statistical analysis functions

### 2. CLI Tool (`scripts/logs-cli.ts`)
- Full-featured command-line interface
- 15+ commands for different log queries
- Color-coded output for easy reading
- Help system with examples
- Supports all query filters

### 3. Real-time Monitor (`scripts/log-monitor.ts`)
- Watch logs as they are created (polls every 2 seconds)
- Color-coded by severity level
- Shows error details inline
- Press Ctrl+C to exit

### 4. Analysis Utilities (`scripts/log-utils.ts`)
- Find slow processing jobs
- Analyze error patterns
- Calculate provider error rates
- Get recent failures by time period
- Generate job timelines
- Create daily reports

### 5. Enhanced Admin Dashboard
- Added advanced filtering to `/admin/logs` page:
  - Date range picker (start/end dates)
  - Job ID filter
  - Document ID filter
  - User ID filter
  - Clear all filters button
- All filters work together
- Export filtered results to CSV

### 6. NPM Scripts
Added convenient commands to package.json:
```bash
npm run logs:recent      # View recent logs
npm run logs:errors      # View error logs only
npm run logs:stats       # Show statistics
npm run logs:health      # Check provider health
npm run logs:jobs        # List all jobs
npm run logs:failed      # List failed jobs
npm run logs:watch       # Real-time monitoring
npm run logs:export      # Export logs to JSON
npm run logs:test        # Test database connection
npm run logs -- <cmd>    # Access CLI with any command
```

### 7. Documentation
- Comprehensive README in `scripts/README.md`
- Usage examples for all commands
- Programmatic API documentation
- Common use case guides
- Troubleshooting section

## Quick Start

### Test Database Connection
```bash
npm run logs:test
```

### View Recent Logs
```bash
npm run logs:recent
```

### View Errors
```bash
npm run logs:errors
```

### Check Statistics
```bash
npm run logs:stats
```

### Check Provider Health
```bash
npm run logs:health
```

### View Logs for Specific Job
```bash
npm run logs -- job <job-id>
```

### Real-time Monitoring
```bash
npm run logs:watch
```

### Get Help
```bash
npm run logs -- help
```

## Key Features

### Multiple Access Methods
1. **CLI** - Quick terminal access
2. **Web Dashboard** - Visual interface with advanced filters
3. **Programmatic** - Import functions in your own scripts
4. **Real-time** - Watch logs as they happen

### Comprehensive Filtering
- By severity (debug, info, warning, error, critical)
- By category (ocr, llm, upload, database, api, system, auth, storage)
- By date range
- By job ID, document ID, user ID, request ID
- Text search across messages and context

### Export Capabilities
- JSON format
- CSV format
- Filtered exports (only export what you need)

### Analytics
- Log statistics by severity and category
- Error pattern analysis
- Provider error rates
- Slow job identification
- Daily reports

## File Structure

```
scripts/
├── README.md           # Comprehensive documentation
├── query-logs.ts       # Database query functions
├── logs-cli.ts         # CLI tool
├── log-monitor.ts      # Real-time monitoring
├── log-utils.ts        # Analysis utilities
└── test-access.ts      # Connection test script
```

## Database Tables Accessed

- **logs** - Main logging table
- **processing_jobs** - Document processing jobs
- **performance_metrics** - Performance tracking
- **api_request_logs** - External API calls
- **error_catalog** - Predefined errors with solutions
- **provider_health** - Provider status tracking

## Examples

### Debugging a Failed Job
```bash
# Find failed jobs
npm run logs:failed

# Get detailed info for specific job
npm run logs -- job-details <job-id>

# View performance metrics
npm run logs -- metrics <job-id>

# Check API logs
npm run logs -- api-logs <job-id>
```

### Monitoring Provider Issues
```bash
# Check all provider health
npm run logs:health

# View OCR-related errors
npm run logs -- category ocr

# View LLM-related errors
npm run logs -- category llm
```

### Analyzing Errors
```bash
# View all errors
npm run logs:errors

# Search for specific issue
npm run logs -- search "timeout"

# Get error solutions
npm run logs -- error-catalog
```

### Exporting Data
```bash
# Export all recent logs
npm run logs:export

# Export with custom filename
npm run logs -- export-json my-logs.json
npm run logs -- export-csv my-logs.csv
```

## Next Steps

1. **Run the test** to verify database access:
   ```bash
   npm run logs:test
   ```

2. **Explore the logs**:
   ```bash
   npm run logs:recent
   npm run logs:stats
   ```

3. **Check provider health**:
   ```bash
   npm run logs:health
   ```

4. **Read the full documentation**:
   ```bash
   cat scripts/README.md
   ```

5. **Try the web dashboard**:
   - Navigate to `/admin/logs` in the application
   - Use the enhanced filters
   - Export logs to CSV

## Benefits

✓ **Complete Visibility** - Access all logs from uploads, OCR, LLM, API calls, system events
✓ **Multiple Interfaces** - CLI, web dashboard, programmatic access
✓ **Real-time Monitoring** - Watch logs as processing happens
✓ **Advanced Filtering** - Find exactly what you need
✓ **Export Capabilities** - Analyze logs offline
✓ **Error Solutions** - Built-in error catalog with fixes
✓ **Performance Tracking** - Identify bottlenecks
✓ **Provider Health** - Monitor API status
✓ **Easy Integration** - Import functions in your own scripts

## Technical Details

- Uses `@supabase/supabase-js` for database access
- TypeScript for type safety
- Color-coded CLI output for readability
- Efficient queries with indexes
- RLS policies respected
- No API keys in logs (sanitized)
- Supports all log severity levels
- Handles large datasets with pagination

## Success Criteria

✅ Created comprehensive query library
✅ Built full-featured CLI tool
✅ Implemented real-time monitoring
✅ Added analysis utilities
✅ Enhanced admin dashboard with advanced filtering
✅ Added convenient npm scripts
✅ Wrote detailed documentation
✅ Created test script
✅ All code builds successfully
✅ No breaking changes to existing functionality

## Build Status

✅ Project builds successfully
✅ All TypeScript compiles without errors
✅ No linting issues
✅ Dependencies installed correctly

You now have complete access to all file processing logs through multiple convenient interfaces!
