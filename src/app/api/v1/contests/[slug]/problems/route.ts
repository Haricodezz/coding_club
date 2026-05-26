import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getContestBySlug, getContestProblems } from '@/lib/services/contest.service';

// GET /api/v1/contests/[slug]/problems
// Returns contest metadata + problem list + visible sample testcases
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const supabase = await createServerSupabaseClient();

    const contest = await getContestBySlug(supabase, slug);
    if (!contest) return NextResponse.json({ error: 'Contest not found' }, { status: 404 });
    if (!contest.is_published) return NextResponse.json({ error: 'Contest not available' }, { status: 403 });

    const problems = await getContestProblems(supabase, contest.id);

    // Fetch visible sample testcases for all problems
    const sampleMap: Record<string, any[]> = {};

    if (problems.length > 0) {
      const problemIds = problems.map((p: any) => p.id);
      const { data: samples } = await (supabase as any)
        .from('problem_testcases')
        .select('id, problem_id, input, expected_output, explanation, display_order')
        .in('problem_id', problemIds)
        .eq('is_hidden', false)
        .order('display_order', { ascending: true });

      (samples || []).forEach((tc: any) => {
        if (!sampleMap[tc.problem_id]) sampleMap[tc.problem_id] = [];
        sampleMap[tc.problem_id].push(tc);
      });
    }

    return NextResponse.json({
      contest: {
        id:           contest.id,
        slug:         contest.slug,
        title:        contest.title,
        description:  contest.description,
        banner_url:   contest.banner_url,
        start_time:   contest.start_time,
        end_time:     contest.end_time,
        freeze_at:    contest.freeze_at,
        contest_type: contest.contest_type,
        rules:        contest.rules,
        practice_mode: contest.practice_mode,
        is_published: contest.is_published,
        status:       contest.status,
      },
      problems,
      samples: sampleMap,
    });
  } catch (err: any) {
    console.error('[PROBLEMS ROUTE ERROR]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
