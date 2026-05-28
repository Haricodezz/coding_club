// ============================================================
// TypeScript Types — CMS Entities
// ============================================================

export interface CmsBlog {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  content: string;
  thumbnail_url?: string;
  tags?: string[];
  author_id?: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  // Joined from users
  author_name?: string;
  author_avatar?: string;
}

export interface CmsAnnouncement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'critical';
  is_active: boolean;
  link_url?: string;
  created_at: string;
  updated_at: string;
}


export interface CmsEvent {
  id: string;
  title: string;
  description: string;
  thumbnail_url?: string;
  event_date: string;
  location: string;
  registration_link?: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface CmsHomepageSection {
  id: string;
  section_key: string;
  section_title?: string;
  section_subtitle?: string;
  section_order: number;
  is_active: boolean;
  content_data: any; // JSONB structure
  created_at: string;
  updated_at: string;
}

export interface CmsGallery {
  id: string;
  image_url: string;
  caption?: string;
  category?: string;
  display_order: number;
  created_at: string;
}

export interface CmsTeamMember {
  id: string;
  user_id?: string;
  email?: string;
  name: string;
  role: string;
  title?: string;
  department?: string;
  join_date?: string;
  avatar_url: string;
  background_cover_url?: string;
  github_url?: string;
  linkedin_url?: string;
  whatsapp_number?: string;
  discord_handle?: string;
  website_url?: string;
  bio?: string;
  expertise_tags?: string[];
  display_order: number;
  is_active: boolean;
  is_archived: boolean;
  contact_visible: boolean;
  created_at: string;
}

export interface CmsTeamSettings {
  id: string;
  page_title: string;
  page_description: string;
  hero_bg_url?: string;
  featured_member_ids?: string[];
  display_mode: string;
  card_size: string;
  connect_links?: { platform: string; url: string; label: string }[];
  updated_at: string;
}

export interface CmsLearningPath {
  id: string;
  slug: string;
  title: string;
  description?: string;
  banner_url?: string;
  difficulty_level: string;
  resource_ids: number[]; // Array of learning resource IDs
  is_published: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}
