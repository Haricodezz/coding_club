-- ============================================================
-- Coding Club MVP — Team Management System Schema Updates
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. ADD NEW COLUMNS TO cms_team_members
ALTER TABLE public.cms_team_members
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS title VARCHAR(255),
ADD COLUMN IF NOT EXISTS department VARCHAR(100),
ADD COLUMN IF NOT EXISTS join_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS background_cover_url VARCHAR,
ADD COLUMN IF NOT EXISTS expertise_tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS discord_handle VARCHAR(100),
ADD COLUMN IF NOT EXISTS website_url VARCHAR,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS contact_visible BOOLEAN DEFAULT TRUE;

-- Update existing policy to not show archived users
DROP POLICY IF EXISTS "Team members are publicly readable" ON public.cms_team_members;
CREATE POLICY "Team members are publicly readable" ON public.cms_team_members FOR SELECT USING (is_active = TRUE AND is_archived = FALSE);


-- 2. CREATE TEAM PAGE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.cms_team_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_title VARCHAR(255) DEFAULT 'Meet the CodingClub Team',
  page_description TEXT DEFAULT 'The passionate people behind the platform — mentors, moderators, content creators, and builders.',
  hero_bg_url VARCHAR,
  featured_member_ids UUID[] DEFAULT '{}',
  display_mode VARCHAR(20) DEFAULT 'Grid',
  card_size VARCHAR(20) DEFAULT 'Standard',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure only one row can exist for global settings
CREATE UNIQUE INDEX IF NOT EXISTS cms_team_settings_single_row_idx ON public.cms_team_settings ((true));

-- RLS FOR SETTINGS
ALTER TABLE public.cms_team_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team settings are publicly readable" ON public.cms_team_settings;
CREATE POLICY "Team settings are publicly readable" ON public.cms_team_settings FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admin write team settings" ON public.cms_team_settings;
CREATE POLICY "Admin write team settings" ON public.cms_team_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'team'))
);

-- Handle updated_at
DROP TRIGGER IF EXISTS set_updated_at_cms_team_settings ON public.cms_team_settings;
CREATE TRIGGER set_updated_at_cms_team_settings BEFORE UPDATE ON public.cms_team_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Insert default row if not exists
INSERT INTO public.cms_team_settings (page_title)
VALUES ('Meet the CodingClub Team')
ON CONFLICT DO NOTHING;
