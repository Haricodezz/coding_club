import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getContestBySlug, joinContest, isParticipant } from '@/lib/services/contest.service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const contest = await getContestBySlug(supabase, slug);
    if (!contest) return NextResponse.json({ error: 'Contest not found' }, { status: 404 });
    if (!contest.is_published) return NextResponse.json({ error: 'Contest not available' }, { status: 403 });

    const now = new Date();
    const end = new Date(contest.end_time);
    if (now > end && !contest.practice_mode) {
      return NextResponse.json({ error: 'Contest has ended' }, { status: 403 });
    }

    if (contest.max_participants) {
      const { count } = await (supabase as any)
        .from('contest_participants')
        .select('*', { count: 'exact', head: true })
        .eq('contest_id', contest.id);
      if (count && count >= contest.max_participants) {
        return NextResponse.json({ error: 'Contest is full' }, { status: 403 });
      }
    }

    const alreadyJoined = await isParticipant(supabase, contest.id, user.id);
    if (alreadyJoined) return NextResponse.json({ success: true, message: 'Already joined' });

    await joinContest(supabase, contest.id, user.id);
    return NextResponse.json({ success: true, message: 'Joined successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ joined: false });

    const contest = await getContestBySlug(supabase, slug);
    if (!contest) return NextResponse.json({ joined: false });

    const joined = await isParticipant(supabase, contest.id, user.id);
    return NextResponse.json({ joined });
  } catch {
    return NextResponse.json({ joined: false });
  }
}
