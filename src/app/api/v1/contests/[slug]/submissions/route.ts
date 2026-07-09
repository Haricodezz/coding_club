import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getContestBySlug } from '@/lib/services/contest.service';


export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const contest = await getContestBySlug(supabase, slug);
    if (!contest) return NextResponse.json({ error: 'Contest not found' }, { status: 404 });

    const problemId = req.nextUrl.searchParams.get('problem_id') || undefined;
    let query = (supabase as any).from('contest_submissions').select(`
      id, language, verdict, runtime_ms, testcases_total, testcases_passed,
      error_message, compile_output, submitted_at,
      question_bank(slug, title)
    `).eq('contest_id', contest.id).eq('user_id', user.id).order('submitted_at', { ascending: false });
    if (problemId) query = query.eq('problem_id', problemId);
    const { data: submissions, error: subErr } = await query;
    if (subErr) throw new Error(subErr.message);

    return NextResponse.json({ submissions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
