-- ============================================================
-- CODING CLUB - V2 SCHEMA MIGRATION
-- Run this in your Supabase Dashboard -> SQL Editor
-- ============================================================

-- -----------------------------------------------
-- 1. ALTER USERS TABLE
-- -----------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS full_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS roll_number VARCHAR(30) UNIQUE,
  ADD COLUMN IF NOT EXISTS academic_year INT CHECK (academic_year BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS branch VARCHAR(100),
  ADD COLUMN IF NOT EXISTS section VARCHAR(10),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS portfolio_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS github_username VARCHAR(100),
  ADD COLUMN IF NOT EXISTS leetcode_username VARCHAR(100),
  ADD COLUMN IF NOT EXISTS codeforces_username VARCHAR(100),
  ADD COLUMN IF NOT EXISTS hackerrank_username VARCHAR(100),
  ADD COLUMN IF NOT EXISTS skills TEXT[],
  ADD COLUMN IF NOT EXISTS lc_easy_solved INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lc_medium_solved INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lc_hard_solved INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lc_total_solved INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lc_points INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lc_last_synced_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS total_points INT DEFAULT 0;

-- -----------------------------------------------
-- 2. NEW TABLES
-- -----------------------------------------------

-- points_history (Append-only ledger)
CREATE TABLE IF NOT EXISTS public.points_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  source VARCHAR(50) NOT NULL, -- leetcode, codeforces, hackerrank, qotd, contest, learning, streak, achievement
  source_id VARCHAR(100), -- identifier to prevent duplicate awards
  points INT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, source, source_id)
);

-- user_platform_stats (Replaces JSONB)
CREATE TABLE IF NOT EXISTS public.user_platform_stats (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  easy_solved INT DEFAULT 0,
  medium_solved INT DEFAULT 0,
  hard_solved INT DEFAULT 0,
  total_solved INT DEFAULT 0,
  rating INT DEFAULT 0,
  ranking INT DEFAULT 0,
  raw_score INT DEFAULT 0,
  points_awarded INT DEFAULT 0,
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sync_cooldown_until TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (user_id, platform)
);

-- leaderboard_snapshots (Daily ranking snapshots)
CREATE TABLE IF NOT EXISTS public.leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  rank INT NOT NULL,
  total_points INT DEFAULT 0,
  qotd_points INT DEFAULT 0,
  lc_points INT DEFAULT 0,
  contest_points INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(snapshot_date, user_id)
);

-- user_achievements
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  achievement_key VARCHAR(100) NOT NULL,
  metadata JSONB DEFAULT '{}',
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_key)
);

-- activity_logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- csv_import_logs
CREATE TABLE IF NOT EXISTS public.csv_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imported_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  filename VARCHAR(255) NOT NULL,
  total_rows INT DEFAULT 0,
  success_rows INT DEFAULT 0,
  failed_rows INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'processing', -- pending, processing, done, rolled_back
  errors JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- streaks
CREATE TABLE IF NOT EXISTS public.streaks (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_active_date DATE,
  streak_points INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------
-- 3. UPDATED TOTAL POINTS TRIGGER
-- -----------------------------------------------
-- Recompute total_points dynamically whenever points_history changes
CREATE OR REPLACE FUNCTION public.recalculate_total_points()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET total_points = (
    SELECT COALESCE(SUM(points), 0)
    FROM public.points_history
    WHERE user_id = NEW.user_id
  )
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recalculate_total_points ON public.points_history;
CREATE TRIGGER trg_recalculate_total_points
AFTER INSERT OR UPDATE OR DELETE ON public.points_history
FOR EACH ROW EXECUTE FUNCTION public.recalculate_total_points();

-- -----------------------------------------------
-- 4. RLS POLICIES
-- -----------------------------------------------
ALTER TABLE public.points_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_platform_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csv_import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;

-- Read access for public/authenticated
CREATE POLICY "Public read points_history" ON public.points_history FOR SELECT USING (TRUE);
CREATE POLICY "Public read user_platform_stats" ON public.user_platform_stats FOR SELECT USING (TRUE);
CREATE POLICY "Public read leaderboard_snapshots" ON public.leaderboard_snapshots FOR SELECT USING (TRUE);
CREATE POLICY "Public read user_achievements" ON public.user_achievements FOR SELECT USING (TRUE);
CREATE POLICY "Public read streaks" ON public.streaks FOR SELECT USING (TRUE);

-- activity_logs: users can see their own, admins can see all
CREATE POLICY "Users read own activity" ON public.activity_logs FOR SELECT USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'team'))
);

-- csv_import_logs: only admins
CREATE POLICY "Admins read import logs" ON public.csv_import_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'team'))
);

-- Insert/Update access is restricted to service_role or authenticated users for specific tables via API
-- (e.g., users can't manually insert into points_history, must go through API)

-- -----------------------------------------------
-- 5. INDEXES
-- -----------------------------------------------
CREATE INDEX IF NOT EXISTS idx_points_history_user_id ON public.points_history(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshots_date ON public.leaderboard_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_users_total_points ON public.users(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_users_academic_year ON public.users(academic_year);
CREATE INDEX IF NOT EXISTS idx_users_branch ON public.users(branch);
