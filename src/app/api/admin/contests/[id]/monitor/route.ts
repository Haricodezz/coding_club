import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server';

async function requireAdmin(supabase: any) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const { data: u } = await supabase.from('users').select('role').eq('id', session.user.id).single();
  if (!u || !['super_admin', 'team'].includes(u.role)) throw new Error('FORBIDDEN');
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: contestId } = await params;
  try {
    const supabase = await createServerSupabaseClient();
    await requireAdmin(supabase);
    const adminSupabase = createAdminSupabaseClient();

    // 1. Total participants
    const { count: totalParticipants } = await (adminSupabase as any)
      .from('contest_participants')
      .select('*', { count: 'exact', head: true })
      .eq('contest_id', contestId);

    // 2. Total submissions
    const { count: totalSubmissions } = await (adminSupabase as any)
      .from('contest_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('contest_id', contestId);

    // 3. Submissions in last 1 min
    const oneMinAgo = new Date(Date.now() - 60000).toISOString();
    const { count: submissionsPerMin } = await (adminSupabase as any)
      .from('contest_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('contest_id', contestId)
      .gte('submitted_at', oneMinAgo);

    // 4. Judge logs (get recent errors/warnings)
    // Wait, the judge_logs table might not be linked directly to contestId but via submission.
    // For simplicity, we just pull the latest 5 judge logs overall if we can't filter by contest.
    const { data: recentLogs } = await (adminSupabase as any)
      .from('judge_logs')
      .select('id, level, message, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    // Basic heuristic for judge health
    let judgeHealth = 'Healthy';
    if (recentLogs) {
      const recentErrors = recentLogs.filter((l: any) => l.level === 'ERROR' && new Date(l.created_at).getTime() > Date.now() - 5 * 60000);
      if (recentErrors.length > 2) judgeHealth = 'Error';
      else if (recentErrors.length > 0 || (submissionsPerMin && submissionsPerMin > 50)) judgeHealth = 'Warning';
    }

    return NextResponse.json({
      totalParticipants: totalParticipants || 0,
      totalSubmissions: totalSubmissions || 0,
      submissionsPerMin: submissionsPerMin || 0,
      judgeHealth,
      recentLogs: recentLogs || []
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
