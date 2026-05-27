-- ==============================================================================
-- SCHEMA V11: Foreign Key Fix
-- Fixes contest_submissions and contest_problem_map to point to the new question_bank
-- ==============================================================================

-- 1. Fix submissions table
ALTER TABLE public.contest_submissions DROP CONSTRAINT IF EXISTS contest_submissions_problem_id_fkey;

-- Clean up orphaned submissions that point to non-existent question_bank IDs
DELETE FROM public.contest_submissions 
WHERE problem_id NOT IN (SELECT id FROM public.question_bank);

ALTER TABLE public.contest_submissions ADD CONSTRAINT contest_submissions_problem_id_fkey 
  FOREIGN KEY (problem_id) REFERENCES public.question_bank(id) ON DELETE CASCADE;

-- 2. Fix contest mapping table
ALTER TABLE public.contest_problem_map DROP CONSTRAINT IF EXISTS contest_problem_map_problem_id_fkey;

-- Clean up orphaned contest mappings that point to non-existent question_bank IDs
DELETE FROM public.contest_problem_map 
WHERE problem_id NOT IN (SELECT id FROM public.question_bank);

ALTER TABLE public.contest_problem_map ADD CONSTRAINT contest_problem_map_problem_id_fkey 
  FOREIGN KEY (problem_id) REFERENCES public.question_bank(id) ON DELETE CASCADE;

-- 3. Fix qotd_calendar table just in case it was missed
ALTER TABLE public.qotd_calendar DROP CONSTRAINT IF EXISTS qotd_calendar_question_bank_id_fkey;
ALTER TABLE public.qotd_calendar ADD CONSTRAINT qotd_calendar_question_bank_id_fkey 
  FOREIGN KEY (question_bank_id) REFERENCES public.question_bank(id) ON DELETE CASCADE;
