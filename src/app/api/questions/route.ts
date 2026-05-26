import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// GET /api/questions — list published public questions
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('custom_questions')
    .select('*')
    .eq('is_published', true)
    .eq('is_public', true)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [] });
}

// POST /api/questions — create a custom question
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: requester } = await supabase.from('users').select('role').eq('id', session.user.id).single();
  if (!requester || (requester.role !== 'super_admin' && requester.role !== 'team')) {
    return NextResponse.json({ error: 'Forbidden: Only admin/team can create questions' }, { status: 403 });
  }

  const body = await req.json();
  const { title, description, test_cases, difficulty, is_public, is_published, constraints } = body;

  if (!title || !description || !test_cases?.length) {
    return NextResponse.json({ error: 'title, description, and at least one test_case are required' }, { status: 400 });
  }

  const { data, error } = await supabase.from('custom_questions').insert({
    title,
    description,
    constraints,
    test_cases,
    difficulty: difficulty || 'Medium',
    creator_id: session.user.id,
    is_public: !!is_public,
    is_published: !!is_published,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}
