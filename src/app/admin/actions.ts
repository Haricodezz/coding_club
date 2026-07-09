'use server';

import { createServerSupabaseClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

// Helper to enforce super_admin / team permissions
async function checkAdminAuth() {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Unauthorized');

  const { data: user, error } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', session.user.id)
    .single();

  if (error || !user || (user.role !== 'super_admin' && user.role !== 'team')) {
    throw new Error('Forbidden: Admin access required');
  }

  return { supabase, session, role: user.role };
}

// -------------------------------------------------------------
// HOMEPAGE SECTIONS ACTIONS
// -------------------------------------------------------------
export async function getHomepageSections() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('cms_homepage_sections')
    .select('*')
    .order('section_order', { ascending: true });
  
  if (error) throw new Error(error.message);
  return data || [];
}

export async function saveHomepageSection(sectionKey: string, payload: {
  section_title?: string;
  section_subtitle?: string;
  section_order?: number;
  is_active?: boolean;
  content_data: any;
}) {
  const { supabase } = await checkAdminAuth();
  
  const { data, error } = await supabase
    .from('cms_homepage_sections')
    .upsert({
      section_key: sectionKey,
      ...payload,
      updated_at: new Date().toISOString()
    }, { onConflict: 'section_key' })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath('/');
  return data;
}

// -------------------------------------------------------------
// BLOGS ACTIONS
// -------------------------------------------------------------
export async function getBlogsAdmin() {
  const { supabase } = await checkAdminAuth();
  const { data, error } = await supabase
    .from('cms_blogs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function saveBlog(blogId: string | null, payload: {
  slug: string;
  title: string;
  summary?: string;
  content: string;
  thumbnail_url?: string;
  tags?: string[];
  is_published: boolean;
}) {
  const { supabase, session } = await checkAdminAuth();

  const dataToSave = {
    ...payload,
    author_id: session.user.id,
    updated_at: new Date().toISOString()
  };

  let error;
  let result;

  if (blogId) {
    const res = await supabase
      .from('cms_blogs')
      .update(dataToSave)
      .eq('id', blogId)
      .select()
      .single();
    error = res.error;
    result = res.data;
  } else {
    const res = await supabase
      .from('cms_blogs')
      .insert({
        ...dataToSave,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    error = res.error;
    result = res.data;
  }

  if (error) throw new Error(error.message);
  revalidatePath('/blogs');
  revalidatePath(`/blogs/${payload.slug}`);
  return result;
}

export async function deleteBlog(blogId: string) {
  const { supabase } = await checkAdminAuth();
  const { error } = await supabase.from('cms_blogs').delete().eq('id', blogId);
  if (error) throw new Error(error.message);
  revalidatePath('/blogs');
}

// -------------------------------------------------------------
// ANNOUNCEMENTS ACTIONS
// -------------------------------------------------------------
export async function getAnnouncementsAdmin() {
  const { supabase } = await checkAdminAuth();
  const { data, error } = await supabase
    .from('cms_announcements')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function saveAnnouncement(id: string | null, payload: {
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'critical';
  is_active: boolean;
}) {
  const { supabase } = await checkAdminAuth();
  const dataToSave = {
    ...payload,
    updated_at: new Date().toISOString()
  };

  let error;
  let result;

  if (id) {
    const res = await supabase
      .from('cms_announcements')
      .update(dataToSave)
      .eq('id', id)
      .select()
      .single();
    error = res.error;
    result = res.data;
  } else {
    const res = await supabase
      .from('cms_announcements')
      .insert({
        ...dataToSave,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    error = res.error;
    result = res.data;
  }

  if (error) throw new Error(error.message);
  revalidatePath('/dashboard');
  revalidatePath('/');
  return result;
}

export async function deleteAnnouncement(id: string) {
  const { supabase } = await checkAdminAuth();
  const { error } = await supabase.from('cms_announcements').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard');
  revalidatePath('/');
}

// -------------------------------------------------------------
// EVENTS ACTIONS
// -------------------------------------------------------------
export async function getEventsAdmin() {
  const { supabase } = await checkAdminAuth();
  const { data, error } = await supabase
    .from('cms_events')
    .select('*')
    .order('event_date', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function saveEvent(id: string | null, payload: {
  title: string;
  description: string;
  thumbnail_url?: string;
  event_date: string;
  location: string;
  registration_link?: string;
  is_published: boolean;
}) {
  const { supabase } = await checkAdminAuth();
  const dataToSave = {
    ...payload,
    updated_at: new Date().toISOString()
  };

  let error;
  let result;

  if (id) {
    const res = await supabase
      .from('cms_events')
      .update(dataToSave)
      .eq('id', id)
      .select()
      .single();
    error = res.error;
    result = res.data;
  } else {
    const res = await supabase
      .from('cms_events')
      .insert({
        ...dataToSave,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    error = res.error;
    result = res.data;
  }

  if (error) throw new Error(error.message);
  revalidatePath('/events');
  return result;
}

export async function deleteEvent(id: string) {
  const { supabase } = await checkAdminAuth();
  const { error } = await supabase.from('cms_events').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/events');
}

// -------------------------------------------------------------
// TEAM MEMBERS ACTIONS
// -------------------------------------------------------------
export async function getTeamMembersAdmin() {
  const { supabase } = await checkAdminAuth();
  const { data, error } = await (supabase as any)
    .from('cms_team_members')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) {
    if (error.message?.includes('schema cache')) {
      throw new Error("Supabase schema cache is stale after the migration. Please go to your Supabase SQL Editor and run: NOTIFY pgrst, 'reload schema';");
    }
    throw new Error(error.message);
  }
  return data || [];
}

export async function saveTeamMember(id: string | null, payload: any) {
  const { supabase } = await checkAdminAuth();
  let error;
  let result;

  if (id) {
    const res = await (supabase as any)
      .from('cms_team_members')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    error = res.error;
    result = res.data;
  } else {
    const res = await (supabase as any)
      .from('cms_team_members')
      .insert({
        ...payload,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    error = res.error;
    result = res.data;
  }

  if (error) throw new Error(error.message);
  revalidatePath('/team');
  return result;
}

export async function deleteTeamMember(id: string) {
  const { supabase } = await checkAdminAuth();
  const { error } = await (supabase as any).from('cms_team_members').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/team');
}

export async function getTeamSettingsAdmin() {
  const { supabase } = await checkAdminAuth();
  const { data, error } = await (supabase as any).from('cms_team_settings').select('*').single();
  if (error && error.code !== 'PGRST116') throw new Error(error.message); // PGRST116 = 0 rows
  return data;
}

export async function saveTeamSettings(payload: any) {
  const { supabase } = await checkAdminAuth();
  
  const { data: existing } = await (supabase as any).from('cms_team_settings').select('id').single();
  let res;
  if (existing) {
    res = await (supabase as any).from('cms_team_settings').update(payload).eq('id', existing.id).select().single();
  } else {
    res = await (supabase as any).from('cms_team_settings').insert(payload).select().single();
  }
  
  if (res.error) throw new Error(res.error.message);
  revalidatePath('/team');
  return res.data;
}

// -------------------------------------------------------------
// GALLERY ACTIONS
// -------------------------------------------------------------
export async function getGalleryAdmin() {
  const { supabase } = await checkAdminAuth();
  const { data, error } = await supabase
    .from('cms_gallery')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function saveGalleryItem(id: string | null, payload: {
  image_url: string;
  caption?: string;
  category?: string;
  display_order: number;
}) {
  const { supabase } = await checkAdminAuth();
  let error;
  let result;

  if (id) {
    const res = await supabase
      .from('cms_gallery')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    error = res.error;
    result = res.data;
  } else {
    const res = await supabase
      .from('cms_gallery')
      .insert({
        ...payload,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    error = res.error;
    result = res.data;
  }

  if (error) throw new Error(error.message);
  revalidatePath('/gallery');
  return result;
}

export async function deleteGalleryItem(id: string) {
  const { supabase } = await checkAdminAuth();
  const { error } = await supabase.from('cms_gallery').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/gallery');
}

// -------------------------------------------------------------
// LEARNING PATHS ACTIONS
// -------------------------------------------------------------
export async function getLearningPathsAdmin() {
  const { supabase } = await checkAdminAuth();
  const { data, error } = await supabase
    .from('cms_learning_paths')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function saveLearningPath(id: string | null, payload: {
  slug: string;
  title: string;
  description?: string;
  banner_url?: string;
  difficulty_level: string;
  resource_ids: number[];
  is_published: boolean;
  display_order: number;
}) {
  const { supabase } = await checkAdminAuth();
  const dataToSave = {
    ...payload,
    updated_at: new Date().toISOString()
  };

  let error;
  let result;

  if (id) {
    const res = await supabase
      .from('cms_learning_paths')
      .update(dataToSave)
      .eq('id', id)
      .select()
      .single();
    error = res.error;
    result = res.data;
  } else {
    const res = await supabase
      .from('cms_learning_paths')
      .insert({
        ...dataToSave,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    error = res.error;
    result = res.data;
  }

  if (error) throw new Error(error.message);
  revalidatePath('/learn');
  return result;
}

export async function deleteLearningPath(id: string) {
  const { supabase } = await checkAdminAuth();
  const { error } = await supabase.from('cms_learning_paths').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/learn');
}

// ============================================================
// QUESTIONS CRUD
// ============================================================

export async function getQuestionsAdmin() {
  const { supabase } = await checkAdminAuth();
  const { data, error } = await supabase.from('questions').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function saveQuestion(id: number | null, payload: any) {
  const { supabase, session } = await checkAdminAuth();
  
  const dataToSave = {
    ...payload,
  };

  let error, result;
  if (id) {
    const res = await supabase.from('questions').update(dataToSave).eq('id', id).select().single();
    error = res.error; result = res.data;
  } else {
    dataToSave.author_id = session.user.id;
    const res = await supabase.from('questions').insert({ ...dataToSave, created_at: new Date().toISOString() }).select().single();
    error = res.error; result = res.data;
  }

  if (error) throw new Error(error.message);
  revalidatePath('/questions');
  return result;
}

export async function deleteQuestion(id: number) {
  const { supabase } = await checkAdminAuth();
  const { error } = await supabase.from('questions').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/questions');
}

// ============================================================
// QOTD CALENDAR CRUD
// ============================================================

export async function getQuestionBankForQotd() {
  const { supabase } = await checkAdminAuth();
  const { data, error } = await supabase
    .from('question_bank' as any)
    .select('id, title, slug, difficulty, tags, statement')
    .eq('is_published', true)
    .eq('available_for_qotd', true)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function getQotdCalendarAdmin() {
  const { supabase } = await checkAdminAuth();
  const { data, error } = await supabase.from('qotd_calendar' as any).select('*, question_bank(title)').order('date', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function saveQotd(date: string, payload: any) {
  const { supabase } = await checkAdminAuth();
  const { data, error } = await supabase.from('qotd_calendar').upsert({ date, ...payload }).select().single();
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard');
  return data;
}

export async function deleteQotd(date: string) {
  const { supabase } = await checkAdminAuth();
  const { error } = await supabase.from('qotd_calendar').delete().eq('date', date);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard');
}

// ============================================================
// LEADERBOARD ADMIN
// ============================================================

export async function getLeaderboardAdmin() {
  const { supabase } = await checkAdminAuth();
  const { data, error } = await supabase.from('leaderboard').select('*').order('total_points', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function refreshLeaderboardAdmin() {
  const { supabase } = await checkAdminAuth();
  const { error } = await supabase.rpc('refresh_leaderboard');
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard');
}

// ============================================================
// RESOURCE HUB CRUD
// ============================================================

export async function getResourceCoursesAdmin() {
  const { supabase } = await checkAdminAuth();
  const { data, error } = await supabase
    .from('resource_courses' as any)
    .select('*, resource_modules(id, title, display_order, resource_items(id, title, is_published))')
    .order('display_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []) as any[];
}

export async function saveResourceCourse(id: string | null, payload: any) {
  const { supabase, session } = await checkAdminAuth();
  const dataToSave = { ...payload, updated_at: new Date().toISOString() };
  let error, result;
  if (id) {
    const res = await supabase.from('resource_courses' as any).update(dataToSave).eq('id', id).select().single();
    error = res.error; result = res.data;
  } else {
    dataToSave.created_by = session.user.id;
    const res = await supabase.from('resource_courses' as any).insert({ ...dataToSave, created_at: new Date().toISOString() }).select().single();
    error = res.error; result = res.data;
  }
  if (error) throw new Error(error.message);
  revalidatePath('/resources');
  return result;
}

export async function deleteResourceCourse(id: string) {
  const { supabase } = await checkAdminAuth();
  const { error } = await supabase.from('resource_courses' as any).delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/resources');
}

export async function updateResourceCourseOrders(updates: { id: string, display_order: number }[]) {
  const { supabase } = await checkAdminAuth();
  for (const u of updates) {
    const { error } = await supabase.from('resource_courses' as any).update({ display_order: u.display_order }).eq('id', u.id);
    if (error) throw new Error(error.message);
  }
  revalidatePath('/resources');
}

export async function saveResourceModule(id: string | null, payload: any): Promise<any> {
  const { supabase } = await checkAdminAuth();
  let error, result;
  if (id) {
    const res = await supabase.from('resource_modules' as any).update(payload).eq('id', id).select().single();
    error = res.error; result = res.data;
  } else {
    const res = await supabase.from('resource_modules' as any).insert({ ...payload, created_at: new Date().toISOString() }).select().single();
    error = res.error; result = res.data;
  }
  if (error) throw new Error(error.message);
  revalidatePath('/resources');
  return result;
}

export async function deleteResourceModule(id: string) {
  const { supabase } = await checkAdminAuth();
  const { error } = await supabase.from('resource_modules' as any).delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/resources');
}

export async function saveResourceItem(id: string | null, payload: any) {
  const { supabase } = await checkAdminAuth();
  const dataToSave = { ...payload, updated_at: new Date().toISOString() };
  let error, result;
  if (id) {
    const res = await supabase.from('resource_items' as any).update(dataToSave).eq('id', id).select().single();
    error = res.error; result = res.data;
  } else {
    const res = await supabase.from('resource_items' as any).insert({ ...dataToSave, created_at: new Date().toISOString() }).select().single();
    error = res.error; result = res.data;
  }
  if (error) throw new Error(error.message);
  revalidatePath('/resources');
  return result;
}

export async function deleteResourceItem(id: string) {
  const { supabase } = await checkAdminAuth();
  const { error } = await supabase.from('resource_items' as any).delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/resources');
}

export async function updateResourceModuleOrders(updates: { id: string, display_order: number }[]) {
  const { supabase } = await checkAdminAuth();
  for (const update of updates) {
    await supabase.from('resource_modules' as any).update({ display_order: update.display_order }).eq('id', update.id);
  }
  revalidatePath('/resources');
}

export async function updateResourceItemOrders(updates: { id: string, display_order: number }[]) {
  const { supabase } = await checkAdminAuth();
  for (const update of updates) {
    await supabase.from('resource_items' as any).update({ display_order: update.display_order }).eq('id', update.id);
  }
  revalidatePath('/resources');
}
