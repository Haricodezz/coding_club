import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server';

async function requireAdmin(supabase: any) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const { data: u } = await supabase.from('users').select('role').eq('id', session.user.id).single();
  if (!u || !['super_admin', 'team'].includes(u.role)) throw new Error('FORBIDDEN');
}

// POST /api/admin/question-bank/[id]/testcases — add testcase
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: problemId } = await params;
  try {
    const supabase = await createServerSupabaseClient();
    await requireAdmin(supabase);
    const body = await req.json();
    const { input, expected_output, is_hidden = true, explanation = '', display_order = 0 } = body;
    if (!input || !expected_output) return NextResponse.json({ error: 'input and expected_output required' }, { status: 400 });
    const adminSupabase = createAdminSupabaseClient();
    const { data, error } = await (adminSupabase as any)
      .from('problem_testcases')
      .insert({ problem_id: problemId, input, expected_output, is_hidden, explanation, display_order })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true, id: data.id }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/admin/question-bank/[id]/testcases?testcase_id=xxx
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await params;
  try {
    const supabase = await createServerSupabaseClient();
    await requireAdmin(supabase);
    const testcaseId = new URL(req.url).searchParams.get('testcase_id');
    if (!testcaseId) return NextResponse.json({ error: 'testcase_id required' }, { status: 400 });
    const adminSupabase = createAdminSupabaseClient();
    const { error } = await (adminSupabase as any).from('problem_testcases').delete().eq('id', testcaseId);
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
