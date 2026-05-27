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
      .from('question_bank')
      .select('*')
      .eq('id', id)
      .single();

    if (!problem) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Graceful fallback for unmigrated columns
    if (problem.parameters && !problem.function_params) {
      problem.function_params = problem.parameters;
    }
    if (problem.return_type && !problem.function_return_type) {
      problem.function_return_type = problem.return_type;
    }

    const { data: testcases } = await (adminSupabase as any)
      .from('question_bank_testcases')
      .select('*')
      .eq('question_id', id)
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
    
    // Try the NEW schema first
    const payloadNew = { ...body };
    delete payloadNew.parameters;
    delete payloadNew.return_type;
    
    let result = await (adminSupabase as any).from('question_bank').update(payloadNew).eq('id', id);
    
    // If it fails because function_params or function_templates doesn't exist, fallback to old schema
    if (result.error && result.error.message.includes('Could not find')) {
      const payloadOld = { ...body };
      if (payloadOld.function_params) payloadOld.parameters = payloadOld.function_params;
      if (payloadOld.function_return_type) payloadOld.return_type = payloadOld.function_return_type;
      delete payloadOld.function_params;
      delete payloadOld.function_return_type;
      delete payloadOld.function_templates;
      
      result = await (adminSupabase as any).from('question_bank').update(payloadOld).eq('id', id);
    }
    
    if (result.error) throw new Error(result.error.message);
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
    const { error } = await (adminSupabase as any).from('question_bank').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
