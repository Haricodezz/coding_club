import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getGlobalLeaderboard } from '@/lib/services/leaderboard.service';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(req.url);

    const yearParam = searchParams.get('year');
    const branch = searchParams.get('branch');
    const year = yearParam && yearParam !== 'all' ? parseInt(yearParam) : undefined;

    const data = await getGlobalLeaderboard(supabase, {
      year: year && !isNaN(year) ? String(year) : undefined,
      branch: branch === 'all' ? undefined : (branch || undefined),
      limit: 100,
    });

    return NextResponse.json({ data });
  } catch (err: any) {
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
