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
  const penalty = opts.attempts * 10 + Math.floor(
    (new Date(opts.solvedAt).getTime() - new Date(opts.startTime).getTime()) / 60000
  );

  const { error } = await supabase.rpc('increment_leaderboard_score', {
    p_contest_id: opts.contestId,
    p_user_id: opts.userId,
    p_problem_id: opts.problemId,
    p_problem_label: opts.problemLabel,
    p_points: opts.points,
    p_penalty: penalty,
    p_solved_at: opts.solvedAt,
    p_attempts: opts.attempts,
    p_runtime_ms: opts.runtimeMs
  });

  if (error) console.error('Failed to update leaderboard:', error);
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

export async function getGlobalLeaderboard(
  supabase: SupabaseClient<any, 'public', any>,
  opts: { platform?: string; limit?: number } = {},
) {
  const query = (supabase as any)
    .from('users')
    .select(`
      id, full_name, username, avatar_url, total_points, branch, academic_year, roll_number, email, role,
      lc_points, lc_easy_solved, lc_medium_solved, lc_hard_solved, lc_total_solved, lc_last_synced_at,
      streaks (current_streak, longest_streak),
      leetcode_user_streaks (current_streak, highest_streak)
    `);

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching global leaderboard:', error);
    throw new Error(error.message);
  }

  let users = data || [];

  // Compute live scores and set platform-specific points for display
  users.forEach((u: any) => {
    const totalPoints = u.total_points || 0; // From DB trigger (includes LeetCode via points_history)
    const leetcodePoints = u.lc_points || 0;
    
    // Overall = Total Points
    u.overall_points = totalPoints;

    // Determine what to display based on selected tab
    if (opts.platform === 'leetcode') {
      u.display_points = leetcodePoints;
    } else if (opts.platform === 'internal') {
      u.display_points = Math.max(0, totalPoints - leetcodePoints);
    } else if (opts.platform === 'contest') {
      // Placeholder if global contest points aren't fully aggregated in 'users' yet
      u.display_points = 0; 
    } else {
      // 'overall'
      u.display_points = u.overall_points;
    }
    
    // The frontend always reads 'total_points' for the score column
    u.total_points = u.display_points;
  });

  // Sort with proper tie-breakers
  users.sort((a: any, b: any) => {
    // Primary sort: Points
    if (b.display_points !== a.display_points) {
      return b.display_points - a.display_points;
    }
    // Tie-breaker 1: Total solved
    if (b.lc_total_solved !== a.lc_total_solved) {
      return (b.lc_total_solved || 0) - (a.lc_total_solved || 0);
    }
    // Tie-breaker 2: Hard solved
    if (b.lc_hard_solved !== a.lc_hard_solved) {
      return (b.lc_hard_solved || 0) - (a.lc_hard_solved || 0);
    }
    // Tie-breaker 3: Alphabetical by username
    return (a.username || '').localeCompare(b.username || '');
  });

  if (opts.limit) {
    users = users.slice(0, opts.limit);
  }

  return users;
}

// -----------------------------------------------
// Get the weekly LeetCode leaderboard
// -----------------------------------------------
export async function getWeeklyLeetCodeLeaderboard(
  supabase: SupabaseClient<any, 'public', any>,
  opts: { limit?: number } = {},
) {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const { data: ledger, error } = await (supabase as any)
    .from('credit_ledger')
    .select(`
      user_id, amount,
      users (
        id, username, full_name, avatar_url, branch, academic_year, roll_number, email, role,
        lc_points, lc_easy_solved, lc_medium_solved, lc_hard_solved, lc_total_solved, lc_last_synced_at,
        streaks (current_streak, longest_streak),
        leetcode_user_streaks (current_streak, highest_streak)
      )
    `)
    .eq('source', 'leetcode_sync')
    .gte('created_at', oneWeekAgo.toISOString());

  if (error) {
    console.error('Error fetching weekly leetcode leaderboard:', error);
    throw new Error(error.message);
  }

  const userTotals = new Map<string, { user: any; total: number }>();
  
  for (const row of ledger || []) {
    if (!row.users) continue;
    const userId = row.user_id;
    const existing = userTotals.get(userId) || { user: row.users, total: 0 };
    existing.total += row.amount;
    userTotals.set(userId, existing);
  }

  const result = Array.from(userTotals.values())
    .map(val => ({
      ...val.user,
      weekly_credits: val.total,
      total_points: val.total // For matching display values on the weekly tab
    }))
    .sort((a, b) => b.weekly_credits - a.weekly_credits);

  if (opts.limit) {
    return result.slice(0, opts.limit);
  }
  return result;
}
