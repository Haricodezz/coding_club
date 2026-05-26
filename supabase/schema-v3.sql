-- ==============================================================================
-- SCHEMA V3: Announcements Update
-- ==============================================================================

-- Add link_url to cms_announcements
ALTER TABLE public.cms_announcements ADD COLUMN IF NOT EXISTS link_url VARCHAR(255);
