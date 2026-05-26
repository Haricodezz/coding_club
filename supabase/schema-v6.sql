-- ==============================================================================
-- SCHEMA V6: Production-Grade Contest CMS Additions
-- Additive migration for advanced contest features and async judge queue
-- ==============================================================================

-- -----------------------------------------------
-- 1. ENHANCE QUESTION BANK
-- -----------------------------------------------
ALTER TABLE public.contest_problems 
  ADD COLUMN IF NOT EXISTS usage_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS acceptance_rate DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS author_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS category VARCHAR(50),
  ADD COLUMN IF NOT EXISTS source_url VARCHAR,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITH TIME ZONE;

-- -----------------------------------------------
-- 2. ASYNC SUBMISSION QUEUE
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.submission_queue (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id   UUID REFERENCES public.contest_submissions(id) ON DELETE CASCADE,
  status          VARCHAR(30) DEFAULT 'PENDING',  -- PENDING, JUDGING, DONE, FAILED
  judge_started   TIMESTAMP WITH TIME ZONE,
  judge_done      TIMESTAMP WITH TIME ZONE,
  attempt         INT DEFAULT 1,
  error_detail    TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for queue workers to pick up pending jobs quickly
CREATE INDEX IF NOT EXISTS idx_submission_queue_status ON public.submission_queue(status, created_at ASC);

-- -----------------------------------------------
-- 3. JUDGE LOGS (for monitoring / observability)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.judge_logs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id   UUID REFERENCES public.contest_submissions(id) ON DELETE SET NULL,
  level           VARCHAR(20) DEFAULT 'INFO',     -- INFO, WARN, ERROR
  message         TEXT NOT NULL,
  details         JSONB,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------
-- ROW LEVEL SECURITY
-- -----------------------------------------------
ALTER TABLE public.submission_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.judge_logs ENABLE ROW LEVEL SECURITY;

-- Only admins and queue workers can read/write submission queue/logs
DROP POLICY IF EXISTS "Admin full access submission queue" ON public.submission_queue;
CREATE POLICY "Admin full access submission queue" ON public.submission_queue FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'team'))
);

DROP POLICY IF EXISTS "Admin full access judge logs" ON public.judge_logs;
CREATE POLICY "Admin full access judge logs" ON public.judge_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'team'))
);

-- Users can see their own submission queue status (so UI can poll)
DROP POLICY IF EXISTS "Users read own submission queue" ON public.submission_queue;
CREATE POLICY "Users read own submission queue" ON public.submission_queue
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.contest_submissions 
      WHERE contest_submissions.id = submission_queue.submission_id 
      AND contest_submissions.user_id = auth.uid()
    )
  );

-- -----------------------------------------------
-- TRIGGERS
-- -----------------------------------------------
DROP TRIGGER IF EXISTS set_updated_at_submission_queue ON public.submission_queue;
CREATE TRIGGER set_updated_at_submission_queue
  BEFORE UPDATE ON public.submission_queue
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------
-- FIX QOTD CALENDAR RLS
-- -----------------------------------------------
DROP POLICY IF EXISTS "Admin write QotD calendar" ON public.qotd_calendar;
CREATE POLICY "Admin write QotD calendar" ON public.qotd_calendar FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'team'))
);

