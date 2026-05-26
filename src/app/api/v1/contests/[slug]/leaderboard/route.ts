import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getContestBySlug, isLeaderboardFrozen } from '@/lib/services/contest.service';
import { getContestLeaderboard } from '@/lib/services/leaderboard.service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const supabase = await createServerSupabaseClient();
    const contest = await getContestBySlug(supabase, slug);
    if (!contest) return NextResponse.json({ error: 'Contest not found' }, { status: 404 });

    const frozen = isLeaderboardFrozen(contest);
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');

    const leaderboard = await getContestLeaderboard(supabase, contest.id, limit);

    return NextResponse.json({
      leaderboard,
      frozen,
      contest_id: contest.id,
      contest_title: contest.title,
      total: leaderboard.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
