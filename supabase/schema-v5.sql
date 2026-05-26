-- ==============================================================================
-- SCHEMA V5: Internal Contest Engine
-- Replaces HackerRank dependency with a fully owned contest platform
-- ==============================================================================

-- -----------------------------------------------
-- 1. QUESTION BANK (shared across all contests)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.contest_problems (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug        VARCHAR UNIQUE NOT NULL,
  title       VARCHAR(255) NOT NULL,
  statement   TEXT NOT NULL,                    -- Markdown
  input_format  TEXT,
  output_format TEXT,
  constraints   TEXT,
  explanation   TEXT,
  difficulty  VARCHAR(20) DEFAULT 'Medium',     -- Easy, Medium, Hard
  points      INT DEFAULT 100,
  time_limit  INT DEFAULT 2000,                 -- milliseconds
  memory_limit INT DEFAULT 256,                 -- MB
  tags        TEXT[] DEFAULT '{}',
  is_public   BOOLEAN DEFAULT FALSE,            -- visible outside contests
  created_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------
-- 2. TESTCASES (visible + hidden per problem)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.problem_testcases (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  problem_id      UUID REFERENCES public.contest_problems(id) ON DELETE CASCADE,
  input           TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_hidden       BOOLEAN DEFAULT TRUE,          -- hidden = not shown to students
  explanation     TEXT,                          -- shown only for visible testcases
  display_order   INT DEFAULT 0,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------
-- 3. CONTESTS
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.contest_events (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug            VARCHAR UNIQUE NOT NULL,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  banner_url      VARCHAR,
  rules           TEXT,                          -- Markdown
  start_time      TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time        TIMESTAMP WITH TIME ZONE NOT NULL,
  freeze_at       TIMESTAMP WITH TIME ZONE,      -- stop leaderboard updates after this
  contest_type    VARCHAR(30) DEFAULT 'ICPC',    -- ICPC, IOI, Speed
  visibility      VARCHAR(20) DEFAULT 'public',  -- public, private, invite_only
  max_participants INT,
  practice_mode   BOOLEAN DEFAULT FALSE,         -- allow participation after end
  is_featured     BOOLEAN DEFAULT FALSE,
  is_published    BOOLEAN DEFAULT FALSE,
  created_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------
-- 4. CONTEST ↔ PROBLEM MAPPING
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.contest_problem_map (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contest_id  UUID REFERENCES public.contest_events(id) ON DELETE CASCADE,
  problem_id  UUID REFERENCES public.contest_problems(id) ON DELETE CASCADE,
  label       VARCHAR(5) DEFAULT 'A',           -- A, B, C, D, ...
  custom_points INT,                            -- overrides problem.points if set
  display_order INT DEFAULT 0,
  is_locked   BOOLEAN DEFAULT FALSE,
  UNIQUE(contest_id, problem_id),
  UNIQUE(contest_id, label)
);

-- -----------------------------------------------
-- 5. CONTEST PARTICIPANTS
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.contest_participants (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contest_id  UUID REFERENCES public.contest_events(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(contest_id, user_id)
);

-- -----------------------------------------------
-- 6. SUBMISSIONS
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.contest_submissions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contest_id      UUID REFERENCES public.contest_events(id) ON DELETE CASCADE,
  problem_id      UUID REFERENCES public.contest_problems(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE,
  language        VARCHAR(30) NOT NULL,           -- python, cpp, java, javascript, go, c
  code            TEXT NOT NULL,
  verdict         VARCHAR(30) NOT NULL,           -- AC, WA, TLE, RE, CE, MLE, JUDGE_ERROR
  runtime_ms      INT,
  memory_kb       INT,
  testcases_total INT DEFAULT 0,
  testcases_passed INT DEFAULT 0,
  error_message   TEXT,
  compile_output  TEXT,
  submitted_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast leaderboard queries
CREATE INDEX IF NOT EXISTS idx_submissions_contest_user 
  ON public.contest_submissions(contest_id, user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_problem_user 
  ON public.contest_submissions(problem_id, user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_verdict 
  ON public.contest_submissions(verdict);

-- -----------------------------------------------
-- 7. CONTEST LEADERBOARD (updated on each AC)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.contest_leaderboard (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contest_id      UUID REFERENCES public.contest_events(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE,
  score           INT DEFAULT 0,
  penalty_minutes INT DEFAULT 0,
  solved_count    INT DEFAULT 0,
  rank            INT,
  solved_problems JSONB DEFAULT '[]',          -- [{ problem_id, label, solved_at, attempts, points }]
  last_ac_at      TIMESTAMP WITH TIME ZONE,
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(contest_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_contest_score 
  ON public.contest_leaderboard(contest_id, score DESC, penalty_minutes ASC);

-- -----------------------------------------------
-- 8. CONTEST ANNOUNCEMENTS
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.contest_announcements (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contest_id  UUID REFERENCES public.contest_events(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  body        TEXT NOT NULL,
  created_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------
-- ROW LEVEL SECURITY
-- -----------------------------------------------

ALTER TABLE public.contest_problems       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problem_testcases      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_problem_map    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_participants   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_submissions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_leaderboard    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_announcements  ENABLE ROW LEVEL SECURITY;

-- Public can read published problems
DROP POLICY IF EXISTS "Public read problems" ON public.contest_problems;
CREATE POLICY "Public read problems" ON public.contest_problems
  FOR SELECT USING (is_public = TRUE OR EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'team')
  ));

-- CRITICAL: hidden testcases are NEVER readable by non-admins
DROP POLICY IF EXISTS "Public read visible testcases" ON public.problem_testcases;
CREATE POLICY "Public read visible testcases" ON public.problem_testcases
  FOR SELECT USING (
    is_hidden = FALSE OR 
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'team'))
  );

-- Published contests visible to all authenticated users
DROP POLICY IF EXISTS "Auth read published contests" ON public.contest_events;
CREATE POLICY "Auth read published contests" ON public.contest_events
  FOR SELECT USING (is_published = TRUE OR EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'team')
  ));

-- Contest problem map readable by participants
DROP POLICY IF EXISTS "Auth read contest problems" ON public.contest_problem_map;
CREATE POLICY "Auth read contest problems" ON public.contest_problem_map
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Participants: users can see their own + admins see all
DROP POLICY IF EXISTS "Users read own participation" ON public.contest_participants;
CREATE POLICY "Users read own participation" ON public.contest_participants
  FOR SELECT USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'team')
  ));

DROP POLICY IF EXISTS "Users join contest" ON public.contest_participants;
CREATE POLICY "Users join contest" ON public.contest_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Submissions: users read own, admins read all
DROP POLICY IF EXISTS "Users read own submissions" ON public.contest_submissions;
CREATE POLICY "Users read own submissions" ON public.contest_submissions
  FOR SELECT USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'team')
  ));

DROP POLICY IF EXISTS "Users insert submissions" ON public.contest_submissions;
CREATE POLICY "Users insert submissions" ON public.contest_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Leaderboard: publicly readable
DROP POLICY IF EXISTS "Public read leaderboard" ON public.contest_leaderboard;
CREATE POLICY "Public read leaderboard" ON public.contest_leaderboard
  FOR SELECT USING (TRUE);

-- Announcements: publicly readable
DROP POLICY IF EXISTS "Public read announcements" ON public.contest_announcements;
CREATE POLICY "Public read announcements" ON public.contest_announcements
  FOR SELECT USING (TRUE);

-- Admin write policies
DROP POLICY IF EXISTS "Admin write problems" ON public.contest_problems;
CREATE POLICY "Admin write problems" ON public.contest_problems FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'team'))
);

DROP POLICY IF EXISTS "Admin write testcases" ON public.problem_testcases;
CREATE POLICY "Admin write testcases" ON public.problem_testcases FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'team'))
);

DROP POLICY IF EXISTS "Admin write contests" ON public.contest_events;
CREATE POLICY "Admin write contests" ON public.contest_events FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'team'))
);

DROP POLICY IF EXISTS "Admin write problem map" ON public.contest_problem_map;
CREATE POLICY "Admin write problem map" ON public.contest_problem_map FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'team'))
);

DROP POLICY IF EXISTS "Admin write leaderboard" ON public.contest_leaderboard;
CREATE POLICY "Admin write leaderboard" ON public.contest_leaderboard FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'team'))
);

DROP POLICY IF EXISTS "Admin write announcements" ON public.contest_announcements;
CREATE POLICY "Admin write announcements" ON public.contest_announcements FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'team'))
);

-- -----------------------------------------------
-- TRIGGERS
-- -----------------------------------------------
DROP TRIGGER IF EXISTS set_updated_at_contest_events ON public.contest_events;
CREATE TRIGGER set_updated_at_contest_events
  BEFORE UPDATE ON public.contest_events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_contest_problems ON public.contest_problems;
CREATE TRIGGER set_updated_at_contest_problems
  BEFORE UPDATE ON public.contest_problems
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
