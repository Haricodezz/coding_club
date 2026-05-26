// ============================================================
// Leaderboard Service — Contest + Global leaderboard
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js';

// -----------------------------------------------
// Update contest leaderboard on AC submission
// -----------------------------------------------
export async function updateContestLeaderboard(
  supabase: SupabaseClient<any, 'public', any>,
  opts: {
    contestId:    string;
    userId:       string;
    problemId:    string;
    problemLabel: string;
    points:       number;
    solvedAt:     string;
    attempts:     number;       // wrong submissions before this AC
    runtimeMs:    number;
    startTime:    string;       // contest start, for penalty calculation
  }
) {
  // Fetch current leaderboard row for this user
  const { data: existing } = await (supabase as any)
    .from('contest_leaderboard')
    .select('*')
    .eq('contest_id', opts.contestId)
    .eq('user_id', opts.userId)
    .maybeSingle();

  const solvedProblems: any[] = existing?.solved_problems || [];

  // Don't double-count if already solved
  if (solvedProblems.some((p: any) => p.problem_id === opts.problemId)) {
    return;
  }

  // Penalty: 10 minutes per wrong attempt + minutes from start to solve
  const minutesFromStart = Math.floor(
    (new Date(opts.solvedAt).getTime() - new Date(opts.startTime).getTime()) / 60000
  );
  const penaltyForProblem = opts.attempts * 10 + minutesFromStart;

  const newSolvedProblems = [
    ...solvedProblems,
    {
      problem_id: opts.problemId,
      label:      opts.problemLabel,
      solved_at:  opts.solvedAt,
      attempts:   opts.attempts,
      points:     opts.points,
      runtime_ms: opts.runtimeMs,
    }
  ];

  const newScore   = (existing?.score || 0) + opts.points;
  const newPenalty = (existing?.penalty_minutes || 0) + penaltyForProblem;
  const newSolved  = (existing?.solved_count || 0) + 1;

  await (supabase as any)
    .from('contest_leaderboard')
    .upsert({
      contest_id:      opts.contestId,
      user_id:         opts.userId,
      score:           newScore,
      penalty_minutes: newPenalty,
      solved_count:    newSolved,
      solved_problems: newSolvedProblems,
      last_ac_at:      opts.solvedAt,
      updated_at:      new Date().toISOString(),
    }, { onConflict: 'contest_id,user_id' });

  // Re-rank all participants
  await rerank(supabase, opts.contestId);
}

// -----------------------------------------------
// Recalculate ranks for all participants in a contest
// -----------------------------------------------
async function rerank(supabase: SupabaseClient<any, 'public', any>, contestId: string) {
  const { data } = await (supabase as any)
    .from('contest_leaderboard')
    .select('id, score, penalty_minutes')
    .eq('contest_id', contestId)
    .order('score', { ascending: false })
    .order('penalty_minutes', { ascending: true });

  if (!data || data.length === 0) return;

  const updates = data.map((row: any, idx: number) => ({
    id:   row.id,
    rank: idx + 1,
  }));

  // Batch update ranks
  await Promise.all(
    updates.map((u: { id: string; rank: number }) =>
      (supabase as any)
        .from('contest_leaderboard')
        .update({ rank: u.rank })
        .eq('id', u.id)
    )
  );
}

// -----------------------------------------------
// Get contest leaderboard (public)
// -----------------------------------------------
export async function getContestLeaderboard(
  supabase: SupabaseClient<any, 'public', any>,
  contestId: string,
  limit = 50,
) {
  const { data, error } = await (supabase as any)
    .from('contest_leaderboard')
    .select(`
      rank, score, penalty_minutes, solved_count, solved_problems, last_ac_at,
      users (
        id, display_name, username, avatar_url,
        user_profiles (branch, year)
      )
    `)
    .eq('contest_id', contestId)
    .order('rank', { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data || [];
}

// -----------------------------------------------
// Get the global leaderboard (existing functionality)
// -----------------------------------------------
export async function getGlobalLeaderboard(
  supabase: SupabaseClient<any, 'public', any>,
  opts: { branch?: string; year?: string; limit?: number } = {},
) {
  let query = (supabase as any)
    .from('users')
    .select(`
      id, display_name, username, avatar_url, total_points,
      user_profiles (branch, year, leetcode_username, github_username)
    `)
    .gt('total_points', 0)
    .order('total_points', { ascending: false })
    .limit(opts.limit || 100);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let result = data || [];
  if (opts.branch) result = result.filter((u: any) => u.user_profiles?.branch === opts.branch);
  if (opts.year)   result = result.filter((u: any) => String(u.user_profiles?.year) === String(opts.year));

  return result;
}
