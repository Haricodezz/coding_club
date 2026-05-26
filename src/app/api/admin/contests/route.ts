import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server';
import { getAllContestsAdmin, saveContest } from '@/lib/services/contest.service';

async function requireAdmin(supabase: any) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const { data: u } = await supabase.from('users').select('role').eq('id', session.user.id).single();
  if (!u || !['super_admin', 'team'].includes(u.role)) throw new Error('FORBIDDEN');
  return session;
}

// GET /api/admin/contests
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    await requireAdmin(supabase);
    const adminSupabase = createAdminSupabaseClient();
    const data = await getAllContestsAdmin(adminSupabase);
    return NextResponse.json({ data });
  } catch (err: any) {
    const status = err.message === 'UNAUTHORIZED' ? 401 : err.message === 'FORBIDDEN' ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

// POST /api/admin/contests — create
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    await requireAdmin(supabase);
    const body = await req.json();
    const { title, slug, description, contest_type, start_time, end_time, is_published, is_featured } = body;
    if (!title || !slug || !start_time || !end_time) {
      return NextResponse.json({ error: 'title, slug, start_time, end_time required' }, { status: 400 });
    }
    const adminSupabase = createAdminSupabaseClient();
    const id = await saveContest(adminSupabase, null, { title, slug, description, contest_type, start_time, end_time, is_published: !!is_published, is_featured: !!is_featured });
    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.message === 'UNAUTHORIZED' ? 401 : 500 });
  }
}

// PATCH /api/admin/contests — update fields
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    await requireAdmin(supabase);
    const body = await req.json();
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const adminSupabase = createAdminSupabaseClient();
    await saveContest(adminSupabase, id, fields);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
