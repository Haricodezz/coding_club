import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createAdminSupabaseClient } from '@/lib/supabase-server';

// POST /api/contests/[id]/sync
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contestId = parseInt(id, 10);

  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch the contest
  const { data: contest } = await supabase
    .from('contests')
    .select('*')
    .eq('id', contestId)
    .single();

  if (!contest) return NextResponse.json({ error: 'Contest not found' }, { status: 404 });

  // Check if HackerRank API key is configured
  const HR_API_KEY = process.env.HR_API_KEY;
  if (!HR_API_KEY || HR_API_KEY === 'your-hackerrank-api-key-here') {
    return NextResponse.json({
      message: 'HackerRank API key not configured. Please set HR_API_KEY in your environment variables.',
      synced_count: 0,
    });
  }

  try {
    // Fetch from HackerRank API
    const hrRes = await fetch(
      `https://www.hackerrank.com/api/internal/contests/${contest.hackerrank_contest_id}/leaderboard`,
      { headers: { Authorization: `Bearer ${HR_API_KEY}` } }
    );

    if (!hrRes.ok) {
      return NextResponse.json({ error: `HackerRank API returned ${hrRes.status}` }, { status: 502 });
    }

    const hrData = await hrRes.json();
    const leaderboard = hrData.leaderboard || hrData.data || [];

    const admin = createAdminSupabaseClient();
    let syncedCount = 0;

    for (const entry of leaderboard) {
      // Match HackerRank handle to our user
      const { data: user } = await admin
        .from('users')
        .select('id')
        .contains('platform_profiles', { hackerrank_handle: entry.hacker_username || entry.handle })
        .single();

      if (!user) continue;

      await admin.from('contest_results').upsert({
        user_id: user.id,
        contest_id: contestId,
        hackerrank_score: entry.score || 0,
        rank: entry.rank || null,
        solved_questions: entry.challenges_solved || 0,
        synced_at: new Date().toISOString(),
      });
      syncedCount++;
    }

    // Update last_synced_at
    await admin.from('contests').update({ last_synced_at: new Date().toISOString() }).eq('id', contestId);

    return NextResponse.json({
      message: `Synced ${syncedCount} results successfully`,
      synced_count: syncedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch from HackerRank', details: String(err) }, { status: 502 });
  }
}
