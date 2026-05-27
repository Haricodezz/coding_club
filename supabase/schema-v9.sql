-- ==============================================================================
-- SCHEMA V9: Unified Question Bank
-- Adds problem_type and companies to unify all questions under contest_problems
-- ==============================================================================

-- Add problem_type and companies
ALTER TABLE public.contest_problems
  ADD COLUMN IF NOT EXISTS problem_type VARCHAR(50) DEFAULT 'practice',
  ADD COLUMN IF NOT EXISTS companies TEXT[] DEFAULT '{}';

-- Trigger schema cache refresh if needed
NOTIFY pgrst, 'reload schema';
