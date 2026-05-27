-- ==============================================================================
-- SCHEMA V15: Course Features (Comments & Gamification)
-- Adds commenting systems for resource items and infrastructure for quizzes
-- ==============================================================================

-- -----------------------------------------------
-- 1. COMMENTS & DISCUSSIONS
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.resource_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES public.resource_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.resource_comments(id) ON DELETE CASCADE, -- For nested replies
  content TEXT NOT NULL,
  upvotes INT DEFAULT 0,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Upvotes tracking table to prevent double-voting
CREATE TABLE IF NOT EXISTS public.resource_comment_votes (
  comment_id UUID REFERENCES public.resource_comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  vote_type SMALLINT DEFAULT 1, -- 1 for upvote, -1 for downvote
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (comment_id, user_id)
);

-- -----------------------------------------------
-- 2. QUIZZES (For Difficulty Assessment)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.resource_quizzes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID REFERENCES public.resource_modules(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  passing_score_percentage INT DEFAULT 80,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.resource_quiz_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID REFERENCES public.resource_quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of strings e.g., ["A", "B", "C", "D"]
  correct_option_index INT NOT NULL,
  explanation TEXT,
  display_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.resource_quiz_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID REFERENCES public.resource_quizzes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  score_percentage INT NOT NULL,
  passed BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- -----------------------------------------------

ALTER TABLE public.resource_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_comment_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Comments Policies
DROP POLICY IF EXISTS "Comments are publicly readable" ON public.resource_comments;
CREATE POLICY "Comments are publicly readable" ON public.resource_comments FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.resource_comments;
CREATE POLICY "Authenticated users can create comments" ON public.resource_comments FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own comments" ON public.resource_comments;
CREATE POLICY "Users can update own comments" ON public.resource_comments FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.resource_comments;
CREATE POLICY "Users can delete own comments" ON public.resource_comments FOR DELETE USING (auth.uid() = user_id);

-- Votes Policies
DROP POLICY IF EXISTS "Votes are publicly readable" ON public.resource_comment_votes;
CREATE POLICY "Votes are publicly readable" ON public.resource_comment_votes FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Users can manage own votes" ON public.resource_comment_votes;
CREATE POLICY "Users can manage own votes" ON public.resource_comment_votes FOR ALL USING (auth.uid() = user_id);

-- Quizzes (Read-only for public, admin write)
DROP POLICY IF EXISTS "Quizzes are publicly readable" ON public.resource_quizzes;
CREATE POLICY "Quizzes are publicly readable" ON public.resource_quizzes FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Quiz questions are publicly readable" ON public.resource_quiz_questions;
CREATE POLICY "Quiz questions are publicly readable" ON public.resource_quiz_questions FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admin write quizzes" ON public.resource_quizzes;
CREATE POLICY "Admin write quizzes" ON public.resource_quizzes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'team'))
);

DROP POLICY IF EXISTS "Admin write quiz questions" ON public.resource_quiz_questions;
CREATE POLICY "Admin write quiz questions" ON public.resource_quiz_questions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'team'))
);

-- Quiz Attempts
DROP POLICY IF EXISTS "Users can read own attempts" ON public.resource_quiz_attempts;
CREATE POLICY "Users can read own attempts" ON public.resource_quiz_attempts FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own attempts" ON public.resource_quiz_attempts;
CREATE POLICY "Users can insert own attempts" ON public.resource_quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
