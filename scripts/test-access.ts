#!/usr/bin/env node

import { getLogStats, getProviderHealth, getRecentLogs } from './query-logs';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

async function testLogAccess() {
  console.log(colorize('\n=== Testing Log Access Mechanisms ===\n', 'bright'));

  try {
    console.log('1. Testing database connection...');
    const stats = await getLogStats();
    console.log(colorize(`   ✓ Connected! Found ${stats.total} logs`, 'green'));

    console.log('\n2. Testing log statistics...');
    console.log(`   Total logs: ${stats.total}`);
    console.log(`   By severity:`, stats.bySeverity);
    console.log(`   By category:`, stats.byCategory);

    console.log('\n3. Testing recent logs query...');
    const recentLogs = await getRecentLogs(5);
    console.log(colorize(`   ✓ Retrieved ${recentLogs.length} recent logs`, 'green'));

    if (recentLogs.length > 0) {
      console.log('\n   Sample log:');
      const log = recentLogs[0];
      console.log(`   - Timestamp: ${log.timestamp}`);
      console.log(`   - Severity: ${log.severity}`);
      console.log(`   - Category: ${log.category}`);
      console.log(`   - Message: ${log.message.substring(0, 80)}...`);
    }

    console.log('\n4. Testing provider health...');
    const health = await getProviderHealth();
    console.log(colorize(`   ✓ Retrieved health for ${health.length} providers`, 'green'));

    if (health.length > 0) {
      const healthySample = health.find(h => h.status === 'healthy');
      if (healthySample) {
        console.log(`   - ${healthySample.provider_name}: ${healthySample.status}`);
      }
    }

    console.log(colorize('\n✓ All tests passed!', 'green'));
    console.log(colorize('\nLog access mechanisms are working correctly.', 'cyan'));
    console.log(colorize('You can now use the CLI commands to access logs.\n', 'cyan'));

  } catch (error) {
    console.error(colorize('\n✗ Test failed:', 'red'), error instanceof Error ? error.message : String(error));
    console.log(colorize('\nMake sure your .env file has valid Supabase credentials.\n', 'red'));
    process.exit(1);
  }
}

testLogAccess();
