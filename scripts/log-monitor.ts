#!/usr/bin/env node

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

function formatLogLine(log: any) {
  const severityColor = getSeverityColor(log.severity);
  const timestamp = new Date(log.timestamp).toLocaleTimeString();

  let line = `${colorize(timestamp, 'cyan')} | ${colorize(log.severity.toUpperCase().padEnd(8), severityColor)} | ${colorize(log.category.toUpperCase().padEnd(8), 'blue')} | ${log.message}`;

  if (log.job_id) {
    line += colorize(` [Job: ${log.job_id.substring(0, 8)}]`, 'dim');
  }

  return line;
}

let lastTimestamp: string | null = null;

async function fetchRecentLogs() {
  let query = supabase
    .from('logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(50);

  if (lastTimestamp) {
    query = query.gt('timestamp', lastTimestamp);
  }

  const { data, error } = await query;

  if (error) {
    console.error(colorize('Error fetching logs:', 'red'), error.message);
    return [];
  }

  return data || [];
}

async function monitorLogs() {
  console.log(colorize('\n=== Real-time Log Monitor ===', 'bright'));
  console.log(colorize('Watching for new logs... (Press Ctrl+C to exit)\n', 'gray'));

  const initialLogs = await fetchRecentLogs();
  if (initialLogs.length > 0) {
    initialLogs.reverse().forEach(log => {
      console.log(formatLogLine(log));
    });
    lastTimestamp = initialLogs[0].timestamp;
  }

  setInterval(async () => {
    const newLogs = await fetchRecentLogs();

    if (newLogs.length > 0) {
      newLogs.reverse().forEach(log => {
        console.log(formatLogLine(log));

        if (log.error_details && (log.severity === 'error' || log.severity === 'critical')) {
          console.log(colorize(`  └─ ${JSON.stringify(log.error_details)}`, 'red'));
        }
      });

      lastTimestamp = newLogs[newLogs.length - 1].timestamp;
    }
  }, 2000);
}

process.on('SIGINT', () => {
  console.log(colorize('\n\nMonitoring stopped.', 'yellow'));
  process.exit(0);
});

monitorLogs().catch(error => {
  console.error(colorize('\nFatal error:', 'red'), error instanceof Error ? error.message : String(error));
  process.exit(1);
});
