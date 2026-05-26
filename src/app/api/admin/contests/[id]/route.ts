import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server';
import { deleteContest } from '@/lib/services/contest.service';

async function requireAdmin(supabase: any) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const { data: u } = await supabase.from('users').select('role').eq('id', session.user.id).single();
  if (!u || !['super_admin', 'team'].includes(u.role)) throw new Error('FORBIDDEN');
}

// DELETE /api/admin/contests/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = await createServerSupabaseClient();
    await requireAdmin(supabase);
    const adminSupabase = createAdminSupabaseClient();
    await deleteContest(adminSupabase, id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET /api/admin/contests/[id] — single contest with full details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = await createServerSupabaseClient();
    await requireAdmin(supabase);
    const adminSupabase = createAdminSupabaseClient();

    const { data: contest } = await (adminSupabase as any)
      .from('contest_events')
      .select('*')
      .eq('id', id)
      .single();

    if (!contest) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: problemMap } = await (adminSupabase as any)
      .from('contest_problem_map')
      .select('*, contest_problems(id, slug, title, difficulty, points, time_limit, tags)')
      .eq('contest_id', id)
      .order('display_order');

    const { data: participants } = await (adminSupabase as any)
      .from('contest_participants')
      .select('user_id, joined_at, users(display_name, username)')
      .eq('contest_id', id)
      .order('joined_at', { ascending: false });

    const { data: recentSubs } = await (adminSupabase as any)
      .from('contest_submissions')
      .select('id, verdict, language, submitted_at, users(display_name), contest_problems(title)')
      .eq('contest_id', id)
      .order('submitted_at', { ascending: false })
      .limit(50);

    return NextResponse.json({ contest, problemMap: problemMap || [], participants: participants || [], recentSubs: recentSubs || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/admin/contests/[id] — update contest
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = await createServerSupabaseClient();
    await requireAdmin(supabase);
    const body = await req.json();
    const adminSupabase = createAdminSupabaseClient();
    const { error } = await (adminSupabase as any).from('contest_events').update(body).eq('id', id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
