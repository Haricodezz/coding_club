// ============================================================
// Contest Service — Contest CRUD, status, participants
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js';

export type ContestStatus = 'upcoming' | 'active' | 'ended' | 'practice';

export function getContestStatus(contest: {
  start_time: string;
  end_time: string;
  practice_mode?: boolean;
}): ContestStatus {
  const now = new Date();
  const start = new Date(contest.start_time);
  const end = new Date(contest.end_time);

  if (now < start) return 'upcoming';
  if (now >= start && now <= end) return 'active';
  if (contest.practice_mode) return 'practice';
  return 'ended';
}

export function isLeaderboardFrozen(contest: {
  freeze_at?: string | null;
  end_time: string;
}): boolean {
  if (!contest.freeze_at) return false;
  const now = new Date();
  return now >= new Date(contest.freeze_at) && now <= new Date(contest.end_time);
}

// -----------------------------------------------
// Get all published contests (public-facing)
// -----------------------------------------------
export async function getPublishedContests(supabase: SupabaseClient<any, 'public', any>) {
  const { data, error } = await (supabase as any)
    .from('contest_events')
    .select('id, slug, title, description, banner_url, start_time, end_time, contest_type, is_featured, practice_mode')
    .eq('is_published', true)
    .order('start_time', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map((c: any) => ({ ...c, status: getContestStatus(c) }));
}

// -----------------------------------------------
// Get a single contest with full details
// -----------------------------------------------
export async function getContestBySlug(supabase: SupabaseClient<any, 'public', any>, slug: string) {
  const { data, error } = await (supabase as any)
    .from('contest_events')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) throw new Error(error.message);
  return data ? { ...data, status: getContestStatus(data) } : null;
}

// -----------------------------------------------
// Get contest problems (labels + metadata, NOT testcases)
// -----------------------------------------------
export async function getContestProblems(supabase: SupabaseClient<any, 'public', any>, contestId: string) {
  const { data, error } = await (supabase as any)
    .from('contest_problem_map')
    .select(`
      id, label, custom_points, display_order, is_locked,
      contest_problems (
        id, slug, title, difficulty, points, time_limit, tags
      )
    `)
    .eq('contest_id', contestId)
    .order('display_order', { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []).map((row: any) => ({
    mapId:        row.id,
    label:        row.label,
    points:       row.custom_points ?? row.contest_problems?.points ?? 100,
    displayOrder: row.display_order,
    isLocked:     row.is_locked,
    ...row.contest_problems,
  }));
}

// -----------------------------------------------
// Check if a user has joined a contest
// -----------------------------------------------
export async function isParticipant(supabase: SupabaseClient<any, 'public', any>, contestId: string, userId: string): Promise<boolean> {
  const { data } = await (supabase as any)
    .from('contest_participants')
    .select('id')
    .eq('contest_id', contestId)
    .eq('user_id', userId)
    .maybeSingle();

  return !!data;
}

// -----------------------------------------------
// Join a contest
// -----------------------------------------------
export async function joinContest(supabase: SupabaseClient<any, 'public', any>, contestId: string, userId: string) {
  const { error } = await (supabase as any)
    .from('contest_participants')
    .upsert({ contest_id: contestId, user_id: userId }, { onConflict: 'contest_id,user_id' });

  if (error) throw new Error(error.message);
  return { success: true };
}

// -----------------------------------------------
// Get participant count
// -----------------------------------------------
export async function getParticipantCount(supabase: SupabaseClient<any, 'public', any>, contestId: string): Promise<number> {
  const { count } = await (supabase as any)
    .from('contest_participants')
    .select('*', { count: 'exact', head: true })
    .eq('contest_id', contestId);

  return count || 0;
}

// ============================================================
// Admin-only functions (use admin supabase client)
// ============================================================

export async function getAllContestsAdmin(supabase: SupabaseClient<any, 'public', any>) {
  const { data, error } = await (supabase as any)
    .from('contest_events')
    .select('*, contest_problem_map(id), contest_participants(id)')
    .order('start_time', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map((c: any) => ({
    ...c,
    status:            getContestStatus(c),
    problem_count:     c.contest_problem_map?.length || 0,
    participant_count: c.contest_participants?.length || 0,
  }));
}

export async function saveContest(supabase: SupabaseClient<any, 'public', any>, id: string | null, payload: Record<string, any>) {
  if (id) {
    const { data, error } = await (supabase as any).from('contest_events').update(payload).eq('id', id).select('id').single();
    if (error) throw new Error(error.message);
    return data.id;
  } else {
    const { data, error } = await (supabase as any).from('contest_events').insert(payload).select('id').single();
    if (error) throw new Error(error.message);
    return data.id;
  }
}

export async function deleteContest(supabase: SupabaseClient<any, 'public', any>, id: string) {
  const { error } = await (supabase as any).from('contest_events').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function addProblemToContest(supabase: SupabaseClient<any, 'public', any>, contestId: string, problemId: string, label: string) {
  const { error } = await (supabase as any).from('contest_problem_map').insert({
    contest_id: contestId,
    problem_id: problemId,
    label
  });
  if (error) throw new Error(error.message);
}

export async function removeProblemFromContest(supabase: SupabaseClient<any, 'public', any>, contestId: string, problemId: string) {
  const { error } = await (supabase as any).from('contest_problem_map').delete().eq('contest_id', contestId).eq('problem_id', problemId);
  if (error) throw new Error(error.message);
}

export async function reorderProblems(supabase: SupabaseClient<any, 'public', any>, contestId: string, updates: { problem_id: string; display_order: number; label: string }[]) {
  // Simple approach: perform updates one by one (or rely on UI to send valid bulk)
  for (const up of updates) {
    const { error } = await (supabase as any)
      .from('contest_problem_map')
      .update({ display_order: up.display_order, label: up.label })
      .eq('contest_id', contestId)
      .eq('problem_id', up.problem_id);
    if (error) throw new Error(error.message);
  }
}

export async function searchQuestionBank(supabase: SupabaseClient<any, 'public', any>, params: { search?: string; difficulty?: string; category?: string; tags?: string[] }) {
  let query = (supabase as any)
    .from('contest_problems')
    .select('id, slug, title, difficulty, points, tags, usage_count, acceptance_rate, is_public')
    .order('created_at', { ascending: false });

  if (params.search) query = query.ilike('title', `%${params.search}%`);
  if (params.difficulty) query = query.eq('difficulty', params.difficulty);
  if (params.category) query = query.eq('category', params.category);
  if (params.tags && params.tags.length > 0) query = query.contains('tags', params.tags);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}
