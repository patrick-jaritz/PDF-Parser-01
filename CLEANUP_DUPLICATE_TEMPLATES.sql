-- ============================================================================
-- CLEANUP DUPLICATE TEMPLATES
-- ============================================================================
-- This script removes duplicate templates, keeping only the most recent one
-- Copy and paste this into your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ziypdqsiajnjyygkjtvc/sql
-- ============================================================================

-- Delete duplicate templates, keeping only the most recent one for each name
DELETE FROM structure_templates
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      name,
      ROW_NUMBER() OVER (PARTITION BY name, is_public ORDER BY created_at DESC) as rn
    FROM structure_templates
    WHERE is_public = true
  ) as ranked
  WHERE rn > 1
);

-- Verify: Show count of each template name
SELECT 
  name,
  COUNT(*) as count,
  MAX(created_at) as latest_created
FROM structure_templates
WHERE is_public = true
GROUP BY name
ORDER BY name;

-- ✅ Done! Duplicates removed. Each template should now appear only once.

