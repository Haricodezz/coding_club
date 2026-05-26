import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server';

async function requireAdmin(supabase: any) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const { data: u } = await supabase.from('users').select('role').eq('id', session.user.id).single();
  if (!u || !['super_admin', 'team'].includes(u.role)) throw new Error('FORBIDDEN');
}

// GET /api/admin/question-bank/[id] — full problem with all testcases
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const supabase = await createServerSupabaseClient();
    await requireAdmin(supabase);
    const adminSupabase = createAdminSupabaseClient();

    const { data: problem } = await (adminSupabase as any)
      .from('contest_problems')
      .select('*')
      .eq('id', id)
      .single();

    if (!problem) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: testcases } = await (adminSupabase as any)
      .from('problem_testcases')
      .select('*')
      .eq('problem_id', id)
      .order('display_order');

    return NextResponse.json({ problem, testcases: testcases || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/admin/question-bank/[id] — update problem
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const supabase = await createServerSupabaseClient();
    await requireAdmin(supabase);
    const body = await req.json();
    const adminSupabase = createAdminSupabaseClient();
    const { error } = await (adminSupabase as any).from('contest_problems').update(body).eq('id', id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/admin/question-bank/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const supabase = await createServerSupabaseClient();
    await requireAdmin(supabase);
    const adminSupabase = createAdminSupabaseClient();
    const { error } = await (adminSupabase as any).from('contest_problems').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
