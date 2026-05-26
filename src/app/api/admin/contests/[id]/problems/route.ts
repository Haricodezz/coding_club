import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server';
import { addProblemToContest, removeProblemFromContest, reorderProblems } from '@/lib/services/contest.service';

async function requireAdmin(supabase: any) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const { data: u } = await supabase.from('users').select('role').eq('id', session.user.id).single();
  if (!u || !['super_admin', 'team'].includes(u.role)) throw new Error('FORBIDDEN');
}

// POST /api/admin/contests/[id]/problems (bulk add)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: contestId } = await params;
  try {
    const supabase = await createServerSupabaseClient();
    await requireAdmin(supabase);
    const body = await req.json();
    const adminSupabase = createAdminSupabaseClient();
    
    // Support bulk
    if (body.problems && Array.isArray(body.problems)) {
      for (const p of body.problems) {
        await addProblemToContest(adminSupabase, contestId, p.problem_id, p.label);
      }
    } else if (body.problem_id) {
      await addProblemToContest(adminSupabase, contestId, body.problem_id, body.label);
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/admin/contests/[id]/problems (reorder)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: contestId } = await params;
  try {
    const supabase = await createServerSupabaseClient();
    await requireAdmin(supabase);
    const body = await req.json();
    const adminSupabase = createAdminSupabaseClient();

    if (body.updates && Array.isArray(body.updates)) {
      await reorderProblems(adminSupabase, contestId, body.updates);
    }
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/admin/contests/[id]/problems?problem_id=xxx
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: contestId } = await params;
  try {
    const supabase = await createServerSupabaseClient();
    await requireAdmin(supabase);
    const problemId = new URL(req.url).searchParams.get('problem_id');
    if (!problemId) return NextResponse.json({ error: 'problem_id required' }, { status: 400 });
    const adminSupabase = createAdminSupabaseClient();

    await removeProblemFromContest(adminSupabase, contestId, problemId);
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
