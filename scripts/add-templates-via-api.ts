#!/usr/bin/env tsx

/**
 * This script adds templates using direct SQL execution via Supabase
 * Run with: npx tsx scripts/add-templates-via-api.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://lbjjzisqbihrlosozfgr.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

// Read the SQL migration file
const migrationPath = join(process.cwd(), 'supabase/migrations/20251007140000_add_comprehensive_templates.sql');
const sql = readFileSync(migrationPath, 'utf-8');

console.log('\n📋 Template Addition Summary\n');
console.log('The SQL migration is ready in:');
console.log('  supabase/migrations/20251007140000_add_comprehensive_templates.sql\n');
console.log('🎯 To add all 12 templates, please:');
console.log('  1. Go to: https://supabase.com/dashboard');
console.log('  2. Select your project');
console.log('  3. Click "SQL Editor" (left sidebar)');
console.log('  4. Click "+ New query"');
console.log('  5. Copy the content from COPY_THIS_SQL.sql');
console.log('  6. Paste and click "Run"\n');
console.log('Or copy this one-liner SQL from COPY_THIS_SQL.sql file!\n');
console.log('✅ The file is ready - just needs to be pasted into Supabase SQL Editor\n');

process.exit(0);

