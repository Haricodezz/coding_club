import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getGlobalLeaderboard, getWeeklyLeetCodeLeaderboard } from '@/lib/services/leaderboard.service';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(req.url);

    const platform = searchParams.get('platform') || 'overall';

    // 1. Fetch raw leaderboard data
    let rawData: any[] = [];
    if (platform === 'weekly_leetcode') {
      rawData = await getWeeklyLeetCodeLeaderboard(supabase, { limit: 200 });
    } else {
      rawData = await getGlobalLeaderboard(supabase, { platform, limit: 500 });
    }

    // 2. Fetch recent snapshot ranks to calculate trends
    const { data: recentDateRow } = await supabase
      .from('leaderboard_snapshots')
      .select('snapshot_date')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const snapshotMap = new Map<string, number>();
    if (recentDateRow?.snapshot_date) {
      const { data: snaps } = await supabase
        .from('leaderboard_snapshots')
        .select('user_id, rank')
        .eq('snapshot_date', recentDateRow.snapshot_date);

      for (const s of snaps || []) {
        snapshotMap.set(s.user_id, s.rank);
      }
    }

    // 3. Process entries with ranks, streaks and trend metrics
    const data = rawData.map((entry: any, index: number) => {
      const currentRank = index + 1;
      const prevRank = snapshotMap.get(entry.id);
      
      // Calculate streaks safely from relations
      const currentStreakObj = entry.streaks?.[0] || entry.streaks || {};
      const leetcodeStreakObj = entry.leetcode_user_streaks?.[0] || entry.leetcode_user_streaks || {};

      const current_streak = platform === 'leetcode' || platform === 'weekly_leetcode'
        ? (leetcodeStreakObj.current_streak || 0)
        : (currentStreakObj.current_streak || 0);

      const longest_streak = platform === 'leetcode' || platform === 'weekly_leetcode'
        ? (leetcodeStreakObj.highest_streak || 0)
        : (currentStreakObj.longest_streak || 0);

      // Problems solved
      const problems_solved = entry.lc_total_solved || 0;

      return {
        ...entry,
        rank: currentRank,
        trend: prevRank ? prevRank - currentRank : 0,
        current_streak,
        longest_streak,
        problems_solved
      };
    });

    // 4. Compute Dynamic Branch & Academic Year distributions for active users
    const { data: allUsersMeta } = await supabase
      .from('users')
      .select('branch, academic_year');

    const branchCounts: Record<string, number> = {};
    const yearCounts: Record<string, number> = {};
    
    for (const u of allUsersMeta || []) {
      if (u.branch) {
        branchCounts[u.branch] = (branchCounts[u.branch] || 0) + 1;
      }
      if (u.academic_year) {
        yearCounts[u.academic_year] = (yearCounts[u.academic_year] || 0) + 1;
      }
    }

    // 5. Fetch Tab Size Counters dynamically
    const { count: overallCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { count: leetcodeCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).not('leetcode_username', 'is', null);
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const { data: weeklyActive } = await supabase.from('credit_ledger')
      .select('user_id', { count: 'exact' })
      .eq('source', 'leetcode_sync')
      .gte('created_at', oneWeekAgo.toISOString());
    const weeklyCount = new Set(weeklyActive?.map(w => w.user_id) || []).size;

    const { count: contestCount } = await supabase.from('contest_leaderboard').select('*', { count: 'exact', head: true });

    // Internal count represents students who have solved QotDs or earned non-leetcode points
    const { count: internalCount } = await supabase.from('users').select('*', { count: 'exact', head: true });

    const tabCounts = {
      overall: overallCount || 0,
      leetcode: leetcodeCount || 0,
      weekly_leetcode: weeklyCount || 0,
      internal: internalCount || 0,
      contest: contestCount || 0
    };

    return NextResponse.json({
      data,
      meta: {
        branchCounts,
        yearCounts,
        tabCounts
      }
    });
  } catch (err: any) {
    console.error('Error in /api/leaderboard:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/leaderboard — snapshot trigger (admin / cron)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      const authHeader = req.headers.get('authorization');
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      const { data: user } = await supabase.from('users').select('role').eq('id', session.user.id).single();
      if (!user || !['super_admin', 'team'].includes(user.role as string)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json({ success: true, message: 'Leaderboard reads live data — no snapshot needed.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
