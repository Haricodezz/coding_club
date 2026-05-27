import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server';

async function requireAdmin(supabase: any) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const { data: u } = await supabase.from('users').select('role').eq('id', session.user.id).single();
  if (!u || !['super_admin', 'team'].includes(u.role)) throw new Error('FORBIDDEN');
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// GET /api/admin/question-bank
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    await requireAdmin(supabase);
    const adminSupabase = createAdminSupabaseClient();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q') || '';
    const difficulty = searchParams.get('difficulty') || '';

    let query = (adminSupabase as any)
      .from('question_bank')
      .select('id, slug, title, difficulty, points, time_limit, tags, is_published, available_for_practice, available_for_contests, available_for_qotd, created_at')
      .order('created_at', { ascending: false });

    if (search) query = query.ilike('title', `%${search}%`);
    if (difficulty) query = query.eq('difficulty', difficulty);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return NextResponse.json({ data: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.message === 'UNAUTHORIZED' ? 401 : 500 });
  }
}

// POST /api/admin/question-bank — create question
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    await requireAdmin(supabase);
    const { data: { session } } = await supabase.auth.getSession();
    const body = await req.json();
    const { title, statement, difficulty = 'Medium', points = 100, time_limit = 2000, tags = [] } = body;
    if (!title || !statement) return NextResponse.json({ error: 'title and statement are required' }, { status: 400 });

    const adminSupabase = createAdminSupabaseClient();
    const slug = slugify(title) + '-' + Date.now().toString(36);
    const { data, error } = await (adminSupabase as any)
      .from('question_bank')
      .insert({ title, slug, statement, difficulty, points, time_limit, tags, author_id: session!.user.id })
      .select('id, slug')
      .single();

    if (error) throw new Error(error.message);

    // Insert testcases if provided
    if (body.testcases && Array.isArray(body.testcases) && body.testcases.length > 0) {
      const tcPayload = body.testcases.map((tc: any, i: number) => ({
        question_id: data.id,
        input: tc.input,
        expected_output: tc.expected_output,
        is_hidden: !!tc.is_hidden,
        display_order: i
      }));
      await (adminSupabase as any).from('question_bank_testcases').insert(tcPayload);
    }

    return NextResponse.json({ success: true, id: data.id, slug: data.slug }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
