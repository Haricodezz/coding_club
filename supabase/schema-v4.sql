-- ==============================================================================
-- SCHEMA V4: Learning Hub Refactor
-- Transforming flat learning paths into a nested Course -> Module -> Item architecture
-- ==============================================================================

-- -----------------------------------------------
-- 1. COURSES / ROADMAPS
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.resource_courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug VARCHAR UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  banner_url VARCHAR,
  difficulty_level VARCHAR(50) DEFAULT 'Beginner', -- Beginner, Intermediate, Advanced
  is_published BOOLEAN DEFAULT FALSE,
  display_order INT DEFAULT 0,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------
-- 2. MODULES (Sections inside a Course)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.resource_modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.resource_courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------
-- 3. INDIVIDUAL RESOURCE ITEMS (Lectures, Docs, Repos)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.resource_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID REFERENCES public.resource_modules(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR UNIQUE NOT NULL,
  description TEXT,
  topic_name VARCHAR(100),
  resource_type VARCHAR(50) NOT NULL, -- youtube, article, github, practice, doc, pdf
  url VARCHAR NOT NULL,
  estimated_duration INT, -- in minutes
  difficulty VARCHAR(20) DEFAULT 'Beginner',
  display_order INT DEFAULT 0,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------
-- 4. TAGS (Optional categorisation)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.resource_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.resource_item_tags (
  item_id UUID REFERENCES public.resource_items(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.resource_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, tag_id)
);

-- -----------------------------------------------
-- 5. USER PROGRESS & BOOKMARKS
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.resource_progress (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.resource_items(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE IF NOT EXISTS public.resource_bookmarks (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.resource_items(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, item_id)
);

-- -----------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- -----------------------------------------------

ALTER TABLE public.resource_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_item_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_bookmarks ENABLE ROW LEVEL SECURITY;

-- Select Policies (Public read if published)
DROP POLICY IF EXISTS "Courses are publicly readable" ON public.resource_courses;
CREATE POLICY "Courses are publicly readable" ON public.resource_courses FOR SELECT USING (is_published = TRUE);

DROP POLICY IF EXISTS "Modules are publicly readable" ON public.resource_modules;
CREATE POLICY "Modules are publicly readable" ON public.resource_modules FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.resource_courses WHERE id = course_id AND is_published = TRUE)
);

DROP POLICY IF EXISTS "Items are publicly readable" ON public.resource_items;
CREATE POLICY "Items are publicly readable" ON public.resource_items FOR SELECT USING (is_published = TRUE);

DROP POLICY IF EXISTS "Tags are publicly readable" ON public.resource_tags;
CREATE POLICY "Tags are publicly readable" ON public.resource_tags FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Item tags are publicly readable" ON public.resource_item_tags;
CREATE POLICY "Item tags are publicly readable" ON public.resource_item_tags FOR SELECT USING (TRUE);

-- Write Policies (Only super_admin or team can manage resources)
DROP POLICY IF EXISTS "Admin write courses" ON public.resource_courses;
CREATE POLICY "Admin write courses" ON public.resource_courses FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'team'))
);

DROP POLICY IF EXISTS "Admin write modules" ON public.resource_modules;
CREATE POLICY "Admin write modules" ON public.resource_modules FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'team'))
);

DROP POLICY IF EXISTS "Admin write items" ON public.resource_items;
CREATE POLICY "Admin write items" ON public.resource_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'team'))
);

DROP POLICY IF EXISTS "Admin write tags" ON public.resource_tags;
CREATE POLICY "Admin write tags" ON public.resource_tags FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'team'))
);

DROP POLICY IF EXISTS "Admin write item tags" ON public.resource_item_tags;
CREATE POLICY "Admin write item tags" ON public.resource_item_tags FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'team'))
);

-- User Progress & Bookmarks (User manages their own)
DROP POLICY IF EXISTS "Users manage own progress" ON public.resource_progress;
CREATE POLICY "Users manage own progress" ON public.resource_progress FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own bookmarks" ON public.resource_bookmarks;
CREATE POLICY "Users manage own bookmarks" ON public.resource_bookmarks FOR ALL USING (auth.uid() = user_id);

-- -----------------------------------------------
-- TRIGGER: updated_at
-- -----------------------------------------------

DROP TRIGGER IF EXISTS set_updated_at_resource_courses ON public.resource_courses;
CREATE TRIGGER set_updated_at_resource_courses BEFORE UPDATE ON public.resource_courses FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_resource_items ON public.resource_items;
CREATE TRIGGER set_updated_at_resource_items BEFORE UPDATE ON public.resource_items FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
