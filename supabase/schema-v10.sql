-- ==============================================================================
-- SCHEMA V10: Question Bank & Architecture Overhaul
-- Centralizing all problems into a single source of truth: question_bank
-- ==============================================================================

-- -----------------------------------------------
-- 1. QUESTION BANK (Master Repository)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.question_bank (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  statement TEXT NOT NULL,
  constraints TEXT,
  difficulty VARCHAR(20) DEFAULT 'Medium', -- Easy, Medium, Hard
  points INT DEFAULT 10,
  time_limit INT DEFAULT 2000,
  memory_limit INT DEFAULT 256,
  tags TEXT[] DEFAULT '{}'::text[],
  
  -- Function Execution Details
  execution_mode VARCHAR(20) DEFAULT 'function', -- 'function' or 'full_program'
  function_name VARCHAR(100),
  function_params JSONB, -- Array of objects: [{ name: "nums", type: "integer_array" }]
  function_return_type VARCHAR(50),
  function_templates JSONB,
  
  -- Unified Ecosystem Flags
  is_published BOOLEAN DEFAULT FALSE,
  available_for_practice BOOLEAN DEFAULT FALSE,
  available_for_contests BOOLEAN DEFAULT FALSE,
  available_for_qotd BOOLEAN DEFAULT FALSE,

  author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------
-- 2. QUESTION BANK TESTCASES
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.question_bank_testcases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID REFERENCES public.question_bank(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  explanation TEXT,
  is_hidden BOOLEAN DEFAULT FALSE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------
-- 3. QOTD SCHEDULER UPDATE
-- -----------------------------------------------
-- Ensure we map question_bank_id, falling back on existing qotd_calendar if needed
ALTER TABLE public.qotd_calendar 
  ADD COLUMN IF NOT EXISTS question_bank_id UUID REFERENCES public.question_bank(id) ON DELETE CASCADE;

-- -----------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- -----------------------------------------------

ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_bank_testcases ENABLE ROW LEVEL SECURITY;

-- Question Bank read access
DROP POLICY IF EXISTS "Public read published question_bank" ON public.question_bank;
CREATE POLICY "Public read published question_bank" ON public.question_bank
  FOR SELECT USING (is_published = true);

-- Testcases read access (only visible if not hidden)
DROP POLICY IF EXISTS "Public read visible testcases" ON public.question_bank_testcases;
CREATE POLICY "Public read visible testcases" ON public.question_bank_testcases
  FOR SELECT USING (
    is_hidden = false AND 
    EXISTS (SELECT 1 FROM public.question_bank WHERE id = question_bank_testcases.question_id AND is_published = true)
  );

-- Admin full access
DROP POLICY IF EXISTS "Admin full access question_bank" ON public.question_bank;
CREATE POLICY "Admin full access question_bank" ON public.question_bank
  FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'team')));

DROP POLICY IF EXISTS "Admin full access question_bank_testcases" ON public.question_bank_testcases;
CREATE POLICY "Admin full access question_bank_testcases" ON public.question_bank_testcases
  FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'team')));

-- -----------------------------------------------
-- TRIGGERS
-- -----------------------------------------------
DROP TRIGGER IF EXISTS set_updated_at_question_bank ON public.question_bank;
CREATE TRIGGER set_updated_at_question_bank
  BEFORE UPDATE ON public.question_bank
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
