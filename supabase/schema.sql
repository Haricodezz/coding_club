-- ============================================================
-- Coding Club MVP — Supabase Database Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- -----------------------------------------------
-- USERS TABLE
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  batch_id VARCHAR(20),
  role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('super_admin', 'team', 'student')),
  avatar_url VARCHAR DEFAULT 'avatar_0.svg',
  platform_profiles JSONB DEFAULT '{}',
  -- platform_profiles shape: { codeforces_handle, leetcode_handle, hackerrank_handle }
  platform_stats JSONB DEFAULT '{}',
  -- platform_stats shape: { codeforces: {solved, rating}, leetcode: {solved, ranking}, hackerrank: {solved} }
  platform_points INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------
-- LEARNING RESOURCES TABLE
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.learning_resources (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL, -- DSA, Web Dev, Competitive Programming, System Design
  youtube_url VARCHAR(500),
  platform VARCHAR(100), -- YouTube, GitHub, Google Drive, etc.
  difficulty VARCHAR(20) NOT NULL DEFAULT 'Beginner', -- Beginner, Intermediate, Advanced
  description TEXT,
  added_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------
-- USER PROGRESS TABLE (Learning Tracker)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_progress (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  resource_id INT REFERENCES public.learning_resources(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT FALSE,
  completion_date TIMESTAMP WITH TIME ZONE,
  time_spent_minutes INT DEFAULT 0,
  notes TEXT,
  PRIMARY KEY (user_id, resource_id)
);

-- -----------------------------------------------
-- QUESTIONS TABLE (QotD + Custom)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.questions (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  example_input TEXT,
  example_output TEXT,
  constraints TEXT,
  test_cases JSONB NOT NULL DEFAULT '[]',
  -- test_cases shape: [{ input: string, expected_output: string, explanation?: string }]
  difficulty VARCHAR(20) NOT NULL DEFAULT 'Medium', -- Easy, Medium, Hard
  tags VARCHAR(100)[],
  author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  is_published BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------
-- QotD CALENDAR
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.qotd_calendar (
  date DATE PRIMARY KEY,
  question_id INT REFERENCES public.questions(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE
);

-- -----------------------------------------------
-- USER QotD SUBMISSIONS TABLE
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_qotd_submissions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  question_id INT REFERENCES public.questions(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  language VARCHAR(30) NOT NULL,
  passed_tests INT DEFAULT 0,
  total_tests INT DEFAULT 0,
  points_earned INT DEFAULT 0,
  stdout TEXT,
  stderr TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, question_id, submitted_at) -- allow multiple attempts
);

-- -----------------------------------------------
-- CONTESTS TABLE
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.contests (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  hackerrank_contest_id VARCHAR(100),
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'upcoming', -- upcoming, active, completed
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------
-- CONTEST RESULTS TABLE
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.contest_results (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  contest_id INT REFERENCES public.contests(id) ON DELETE CASCADE,
  hackerrank_score INT DEFAULT 0,
  rank INT,
  solved_questions INT DEFAULT 0,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, contest_id)
);

-- -----------------------------------------------
-- CUSTOM QUESTIONS TABLE (Separate from QotD)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.custom_questions (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  constraints TEXT,
  test_cases JSONB NOT NULL DEFAULT '[]',
  difficulty VARCHAR(20) NOT NULL DEFAULT 'Medium',
  creator_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  is_published BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------
-- LEADERBOARD MATERIALIZED VIEW
-- -----------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS public.leaderboard AS
SELECT
  u.id,
  u.username,
  u.avatar_url,
  u.batch_id,
  u.platform_points,
  -- QotD points: 10 per unique question solved
  COALESCE(
    (SELECT COUNT(DISTINCT uqs.question_id) * 10
     FROM public.user_qotd_submissions uqs
     WHERE uqs.user_id = u.id AND uqs.passed_tests = uqs.total_tests AND uqs.total_tests > 0),
    0
  )::INT AS qotd_points,
  -- Contest points: sum of HackerRank scores × 0.8
  COALESCE(
    (SELECT SUM(cr.hackerrank_score) * 0.8
     FROM public.contest_results cr
     WHERE cr.user_id = u.id),
    0
  )::INT AS contest_points,
  -- Total
  (
    COALESCE(
      (SELECT COUNT(DISTINCT uqs.question_id) * 10
       FROM public.user_qotd_submissions uqs
       WHERE uqs.user_id = u.id AND uqs.passed_tests = uqs.total_tests AND uqs.total_tests > 0),
      0
    ) +
    COALESCE(
      (SELECT SUM(cr.hackerrank_score) * 0.8
       FROM public.contest_results cr
       WHERE cr.user_id = u.id),
      0
    ) +
    COALESCE(u.platform_points, 0)
  )::INT AS total_points,
  NOW() AS last_updated
FROM public.users u
ORDER BY total_points DESC;

-- Index for fast queries
CREATE UNIQUE INDEX IF NOT EXISTS leaderboard_user_idx ON public.leaderboard(id);

-- -----------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qotd_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_qotd_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_questions ENABLE ROW LEVEL SECURITY;

-- Users: can read everyone, update only self
DROP POLICY IF EXISTS "Users are publicly readable" ON public.users;
CREATE POLICY "Users are publicly readable" ON public.users FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Learning resources: public read, authenticated insert (admin manages via service role)
DROP POLICY IF EXISTS "Learning resources are publicly readable" ON public.learning_resources;
CREATE POLICY "Learning resources are publicly readable" ON public.learning_resources FOR SELECT USING (is_active = TRUE);

-- User progress: user sees + edits only their own
DROP POLICY IF EXISTS "Users manage own progress" ON public.user_progress;
CREATE POLICY "Users manage own progress" ON public.user_progress FOR ALL USING (auth.uid() = user_id);

-- Questions: public read if published
DROP POLICY IF EXISTS "Published questions are readable" ON public.questions;
CREATE POLICY "Published questions are readable" ON public.questions FOR SELECT USING (is_published = TRUE);
DROP POLICY IF EXISTS "Authors can manage own questions" ON public.questions;
CREATE POLICY "Authors can manage own questions" ON public.questions FOR ALL USING (auth.uid() = author_id);

-- QotD calendar: public read, admin write
DROP POLICY IF EXISTS "QotD calendar is public" ON public.qotd_calendar;
CREATE POLICY "QotD calendar is public" ON public.qotd_calendar FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Admin write QotD calendar" ON public.qotd_calendar;
CREATE POLICY "Admin write QotD calendar" ON public.qotd_calendar FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'team'))
);


-- QotD submissions: user sees own
DROP POLICY IF EXISTS "Users see own submissions" ON public.user_qotd_submissions;
CREATE POLICY "Users see own submissions" ON public.user_qotd_submissions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own submissions" ON public.user_qotd_submissions;
CREATE POLICY "Users can insert own submissions" ON public.user_qotd_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Contests: public read
DROP POLICY IF EXISTS "Contests are public" ON public.contests;
CREATE POLICY "Contests are public" ON public.contests FOR SELECT USING (TRUE);

-- Contest results: public read
DROP POLICY IF EXISTS "Contest results are public" ON public.contest_results;
CREATE POLICY "Contest results are public" ON public.contest_results FOR SELECT USING (TRUE);

-- Custom questions: creator manages, public sees if published+public
DROP POLICY IF EXISTS "Custom questions: public read if published" ON public.custom_questions;
CREATE POLICY "Custom questions: public read if published" ON public.custom_questions FOR SELECT USING (is_published = TRUE AND is_public = TRUE);
DROP POLICY IF EXISTS "Creators manage own custom questions" ON public.custom_questions;
CREATE POLICY "Creators manage own custom questions" ON public.custom_questions FOR ALL USING (auth.uid() = creator_id);

-- -----------------------------------------------
-- HELPER FUNCTION: Refresh leaderboard
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_leaderboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.leaderboard;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------
-- SEED: Default QotD question (example)
-- -----------------------------------------------
-- INSERT INTO public.questions (title, description, example_input, example_output, test_cases, difficulty, is_published)
-- VALUES (
--   'Sum of Array',
--   'Given an array of n integers, find their sum.',
--   '5\n1 2 3 4 5',
--   '15',
--   '[{"input":"5\n1 2 3 4 5","expected_output":"15","explanation":"Sum of 1+2+3+4+5"},{"input":"3\n10 20 30","expected_output":"60","explanation":"Sum of 10+20+30"}]',
--   'Easy',
--   TRUE
-- );

-- ============================================================
-- AUDIT FIXES & OPTIMIZATIONS (Core)
-- ============================================================

-- 1. Protect User Profiles from Privilege Escalation
CREATE OR REPLACE FUNCTION public.protect_user_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  NEW.role = OLD.role;
  NEW.platform_points = OLD.platform_points;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_user_fields_trigger ON public.users;
CREATE TRIGGER protect_user_fields_trigger
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.protect_user_fields();

-- 2. Handle updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_users ON public.users;
CREATE TRIGGER set_updated_at_users BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. Create missing indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_learning_resources_added_by ON public.learning_resources(added_by);
CREATE INDEX IF NOT EXISTS idx_questions_author_id ON public.questions(author_id);
CREATE INDEX IF NOT EXISTS idx_user_qotd_submissions_user_id ON public.user_qotd_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_qotd_submissions_question_id ON public.user_qotd_submissions(question_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_resource_id ON public.user_progress(resource_id);
CREATE INDEX IF NOT EXISTS idx_qotd_calendar_question_id ON public.qotd_calendar(question_id);
CREATE INDEX IF NOT EXISTS idx_custom_questions_creator_id ON public.custom_questions(creator_id);

-- 4. Auto-create user profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, username, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'avatar_0.svg')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- CMS-DRIVEN ADDITIONS
-- ============================================================

-- -----------------------------------------------
-- CMS BLOGS TABLE
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.cms_blogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  summary TEXT,
  content TEXT NOT NULL,
  thumbnail_url VARCHAR,
  tags VARCHAR(50)[],
  author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------
-- CMS ANNOUNCEMENTS TABLE
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.cms_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'critical')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------
-- CMS EVENTS TABLE
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.cms_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  thumbnail_url VARCHAR,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location VARCHAR(255) DEFAULT 'Online',
  registration_link VARCHAR(500),
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------
-- CMS HOMEPAGE SECTIONS TABLE
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.cms_homepage_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key VARCHAR UNIQUE NOT NULL,
  section_title VARCHAR(255),
  section_subtitle TEXT,
  section_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  content_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------
-- CMS GALLERY TABLE
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.cms_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url VARCHAR NOT NULL,
  caption VARCHAR(255),
  category VARCHAR(100),
  display_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------
-- CMS TEAM MEMBERS TABLE
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.cms_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL,
  avatar_url VARCHAR NOT NULL,
  github_url VARCHAR,
  linkedin_url VARCHAR,
  bio TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------
-- CMS LEARNING PATHS TABLE
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.cms_learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  banner_url VARCHAR,
  difficulty_level VARCHAR(50) DEFAULT 'Beginner',
  resource_ids INT[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT FALSE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------
-- ROW LEVEL SECURITY (RLS) FOR CMS TABLES
-- -----------------------------------------------
ALTER TABLE public.cms_blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_homepage_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_learning_paths ENABLE ROW LEVEL SECURITY;

-- Select Policies (Public read if active/published)
DROP POLICY IF EXISTS "Blogs are publicly readable" ON public.cms_blogs;
CREATE POLICY "Blogs are publicly readable" ON public.cms_blogs FOR SELECT USING (is_published = TRUE);
DROP POLICY IF EXISTS "Announcements are publicly readable" ON public.cms_announcements;
CREATE POLICY "Announcements are publicly readable" ON public.cms_announcements FOR SELECT USING (is_active = TRUE);
DROP POLICY IF EXISTS "Events are publicly readable" ON public.cms_events;
CREATE POLICY "Events are publicly readable" ON public.cms_events FOR SELECT USING (is_published = TRUE);
DROP POLICY IF EXISTS "Homepage sections are publicly readable" ON public.cms_homepage_sections;
CREATE POLICY "Homepage sections are publicly readable" ON public.cms_homepage_sections FOR SELECT USING (is_active = TRUE);
DROP POLICY IF EXISTS "Gallery is publicly readable" ON public.cms_gallery;
CREATE POLICY "Gallery is publicly readable" ON public.cms_gallery FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Team members are publicly readable" ON public.cms_team_members;
CREATE POLICY "Team members are publicly readable" ON public.cms_team_members FOR SELECT USING (is_active = TRUE);
DROP POLICY IF EXISTS "Learning paths are publicly readable" ON public.cms_learning_paths;
CREATE POLICY "Learning paths are publicly readable" ON public.cms_learning_paths FOR SELECT USING (is_published = TRUE);

-- Write Policies (Only super_admin or team can manage CMS data)
-- We check public.users table to see if the authenticated user has a 'super_admin' or 'team' role.
DROP POLICY IF EXISTS "Admin write blogs" ON public.cms_blogs;
CREATE POLICY "Admin write blogs" ON public.cms_blogs FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'team'))
);
DROP POLICY IF EXISTS "Admin write announcements" ON public.cms_announcements;
CREATE POLICY "Admin write announcements" ON public.cms_announcements FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'team'))
);
DROP POLICY IF EXISTS "Admin write events" ON public.cms_events;
CREATE POLICY "Admin write events" ON public.cms_events FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'team'))
);
DROP POLICY IF EXISTS "Admin write homepage sections" ON public.cms_homepage_sections;
CREATE POLICY "Admin write homepage sections" ON public.cms_homepage_sections FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'team'))
);
DROP POLICY IF EXISTS "Admin write gallery" ON public.cms_gallery;
CREATE POLICY "Admin write gallery" ON public.cms_gallery FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'team'))
);
DROP POLICY IF EXISTS "Admin write team members" ON public.cms_team_members;
CREATE POLICY "Admin write team members" ON public.cms_team_members FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'team'))
);
DROP POLICY IF EXISTS "Admin write learning paths" ON public.cms_learning_paths;
CREATE POLICY "Admin write learning paths" ON public.cms_learning_paths FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'team'))
);

-- -----------------------------------------------
-- SEED INITIAL HOMEPAGE SECTIONS
-- -----------------------------------------------
INSERT INTO public.cms_homepage_sections (section_key, section_title, section_subtitle, section_order, content_data)
VALUES 
(
  'hero',
  'Code Smarter, Compete Harder',
  'Learn Together. Your all-in-one platform for daily coding challenges, real-time leaderboards, curated learning resources, and a built-in IDE.',
  1,
  '{"badge": "🎓 Open to all students", "primary_btn_text": "Get Started 🚀", "primary_btn_link": "/login", "secondary_btn_text": "View Leaderboard", "secondary_btn_link": "/leaderboard", "editor_filename": "solution.py — QotD #42", "editor_code": "def two_sum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        complement = target - n\n        if complement in seen:\n            return [seen[complement], i]\n        seen[n] = i\n    return []\n\n# ✅ All 3 test cases passed — 10 pts earned!"}'
),
(
  'features',
  'Built for Competitive Programmers',
  'Everything You Need',
  2,
  '{"cards": [
    {"icon": "💡", "title": "Question of the Day", "desc": "Solve a new coding challenge every day and climb the leaderboard."},
    {"icon": "⚡", "title": "Online IDE", "desc": "Write and run code in 6 languages — Python, C++, Java, JS, Go, C."},
    {"icon": "📚", "title": "Learning Module", "desc": "50+ curated DSA, Web Dev, and CP resources with progress tracking."},
    {"icon": "📊", "title": "Live Leaderboard", "desc": "Real-time rankings with gold, silver, bronze for top performers."},
    {"icon": "🏆", "title": "Contests", "desc": "Participate in HackerRank contests and see your rank on our board."},
    {"icon": "🧑‍💻", "title": "Student Profiles", "desc": "Link your Codeforces, LeetCode, HackerRank — earn points automatically."}
  ]}'
),
(
  'stats',
  'Our Community In Numbers',
  'Growth Metrics',
  3,
  '{"stats": [
    {"value": "200", "label": "Students"},
    {"value": "50+", "label": "Resources"},
    {"value": "6", "label": "Languages"},
    {"value": "∞", "label": "Possibilities"}
  ]}'
),
(
  'cta',
  'Ready to Start Coding?',
  'Join your batch, solve today''s challenge, and watch your rank climb.',
  4,
  '{"btn_text": "Sign In with Batch ID 🎓", "btn_link": "/login"}'
)
ON CONFLICT (section_key) DO UPDATE 
SET section_title = EXCLUDED.section_title,
    section_subtitle = EXCLUDED.section_subtitle,
    content_data = EXCLUDED.content_data;

-- ============================================================
-- AUDIT FIXES & OPTIMIZATIONS (CMS)
-- ============================================================

-- Handle updated_at timestamps for CMS tables
DROP TRIGGER IF EXISTS set_updated_at_cms_blogs ON public.cms_blogs;
CREATE TRIGGER set_updated_at_cms_blogs BEFORE UPDATE ON public.cms_blogs FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_cms_announcements ON public.cms_announcements;
CREATE TRIGGER set_updated_at_cms_announcements BEFORE UPDATE ON public.cms_announcements FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_cms_events ON public.cms_events;
CREATE TRIGGER set_updated_at_cms_events BEFORE UPDATE ON public.cms_events FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_cms_homepage_sections ON public.cms_homepage_sections;
CREATE TRIGGER set_updated_at_cms_homepage_sections BEFORE UPDATE ON public.cms_homepage_sections FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_cms_learning_paths ON public.cms_learning_paths;
CREATE TRIGGER set_updated_at_cms_learning_paths BEFORE UPDATE ON public.cms_learning_paths FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Indexes for CMS foreign keys
CREATE INDEX IF NOT EXISTS idx_cms_blogs_author_id ON public.cms_blogs(author_id);
