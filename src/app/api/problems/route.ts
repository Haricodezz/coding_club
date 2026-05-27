import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const difficulty = searchParams.get('difficulty') || '';
    const tags = searchParams.getAll('tags');
    const companies = searchParams.getAll('companies');
    const type = searchParams.get('type') || '';
    const status = searchParams.get('status') || ''; // 'solved', 'attempted', 'unsolved'

    const { data: { user } } = await supabase.auth.getUser();

    // Base query for public problems
    let query = (supabase as any)
      .from('question_bank')
      .select('id, slug, title, difficulty, points, tags, is_published, available_for_practice')
      .eq('available_for_practice', true)
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }
    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }
    if (tags && tags.length > 0) {
      query = query.contains('tags', tags);
    }

    const { data: problems, error } = await query;
    if (error) throw error;

    let finalProblems: any[] = problems || [];

    // Process user status if logged in
    if (user) {
      const { data: submissions, error: subErr } = await (supabase as any)
        .from('contest_submissions')
        .select('problem_id, verdict')
        .eq('user_id', user.id);
      
      if (!subErr && submissions) {
        const solvedSet = new Set(submissions.filter((s: any) => s.verdict === 'AC').map((s: any) => s.problem_id));
        const attemptedSet = new Set(submissions.map((s: any) => s.problem_id));

        finalProblems = finalProblems.map(p => ({
          ...p,
          status: solvedSet.has(p.id) ? 'solved' : (attemptedSet.has(p.id) ? 'attempted' : 'unsolved')
        }));

        if (status === 'solved') {
          finalProblems = finalProblems.filter(p => p.status === 'solved');
        } else if (status === 'attempted') {
          finalProblems = finalProblems.filter(p => p.status === 'attempted');
        } else if (status === 'unsolved') {
          finalProblems = finalProblems.filter(p => p.status === 'unsolved');
        }
      }
    } else {
      // If user isn't logged in, status filter returns nothing if filtering by status
      if (status) {
        finalProblems = [];
      } else {
        finalProblems = finalProblems.map(p => ({ ...p, status: 'unsolved' }));
      }
    }

    return NextResponse.json({ data: finalProblems });
  } catch (err: any) {
    console.error('[API PROBLEMS]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
