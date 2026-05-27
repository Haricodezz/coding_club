-- ============================================================
-- SCHEMA V12: Dashboard & Profile Redesign Features
-- ============================================================

-- 1. Extend Users table for preferences
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS dashboard_layout JSONB DEFAULT '["qotd", "quick_stats", "submissions", "contests", "quick_links"]',
  ADD COLUMN IF NOT EXISTS theme_accent VARCHAR(50) DEFAULT 'purple';

-- 2. New Table: user_performance_analytics
CREATE TABLE IF NOT EXISTS public.user_performance_analytics (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  win_rate NUMERIC(5, 2) DEFAULT 0.00,
  accuracy NUMERIC(5, 2) DEFAULT 0.00,
  total_submissions INT DEFAULT 0,
  accepted_submissions INT DEFAULT 0,
  improvement_trend NUMERIC(5, 2) DEFAULT 0.00,
  radar_chart_data JSONB DEFAULT '{"algorithms": 0, "data_structures": 0, "math": 0, "strings": 0, "dynamic_programming": 0}',
  last_computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Extend user_achievements (ensure metadata can store badge icons)
-- (No schema change needed, metadata JSONB is sufficient, but we add an index)
CREATE INDEX IF NOT EXISTS idx_user_achievements_awarded ON public.user_achievements(awarded_at DESC);

-- 4. Extend streaks
ALTER TABLE public.streaks
  ADD COLUMN IF NOT EXISTS next_milestone INT DEFAULT 7;
