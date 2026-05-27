-- ==============================================================================
-- SCHEMA V7: User Blog Submission System
-- Additive migration — does NOT alter existing cms_blogs table
-- ==============================================================================

-- -----------------------------------------------
-- 1. USER BLOGS TABLE
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_blogs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title           TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  content         TEXT NOT NULL,         -- Tiptap HTML output
  summary         TEXT,
  author_id       UUID REFERENCES public.users(id) ON DELETE CASCADE,
  cover_image     TEXT,
  tags            TEXT[] DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
  rejection_note  TEXT,
  is_featured     BOOLEAN DEFAULT false,
  view_count      INT DEFAULT 0,
  reviewed_by     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at     TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for public listing (approved + ordering)
CREATE INDEX IF NOT EXISTS idx_user_blogs_status ON public.user_blogs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_blogs_author ON public.user_blogs(author_id);
CREATE INDEX IF NOT EXISTS idx_user_blogs_featured ON public.user_blogs(is_featured, status);

-- -----------------------------------------------
-- 2. ROW LEVEL SECURITY
-- -----------------------------------------------
ALTER TABLE public.user_blogs ENABLE ROW LEVEL SECURITY;

-- Authors can CRUD their own blogs
DROP POLICY IF EXISTS "Authors manage own blogs" ON public.user_blogs;
CREATE POLICY "Authors manage own blogs" ON public.user_blogs
  FOR ALL
  USING (author_id = auth.uid());

-- Anyone can read approved blogs
DROP POLICY IF EXISTS "Public read approved blogs" ON public.user_blogs;
CREATE POLICY "Public read approved blogs" ON public.user_blogs
  FOR SELECT
  USING (status = 'approved');

-- Admins have full access
DROP POLICY IF EXISTS "Admin full access user blogs" ON public.user_blogs;
CREATE POLICY "Admin full access user blogs" ON public.user_blogs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('super_admin', 'team')
    )
  );

-- -----------------------------------------------
-- 3. AUTO-UPDATE TRIGGER
-- -----------------------------------------------
DROP TRIGGER IF EXISTS set_updated_at_user_blogs ON public.user_blogs;
CREATE TRIGGER set_updated_at_user_blogs
  BEFORE UPDATE ON public.user_blogs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
