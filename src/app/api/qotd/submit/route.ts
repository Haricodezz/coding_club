import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { executePiston } from '@/lib/piston';
import { PointsService } from '@/lib/services/points.service';
import type { TestCase, TestCaseResult } from '@/types';

// POST /api/qotd/submit
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { code, language, problem_slug } = await req.json();
  if (!code || !language || !problem_slug) {
    return NextResponse.json({ error: 'code, language, problem_slug required' }, { status: 400 });
  }

  // Fetch the question + test cases
  const { data: question, error: qErr } = await (supabase as any)
    .from('question_bank')
    .select('*')
    .eq('slug', problem_slug)
    .single();

  if (qErr || !question) return NextResponse.json({ error: 'Question not found' }, { status: 404 });

  const question_id = question.id;

  const adminSupabase = await import('@/lib/supabase-server').then(m => m.createAdminSupabaseClient());
  const { data: testcases, error: tcErr } = await (adminSupabase as any)
    .from('question_bank_testcases')
    .select('id, input, expected_output, is_hidden')
    .eq('question_id', question.id)
    .order('display_order', { ascending: true });

  if (tcErr || !testcases || testcases.length === 0) {
    return NextResponse.json({ error: 'No testcases configured for this problem' }, { status: 500 });
  }

  let finalCode = code;
  if (question.execution_mode === 'function' && question.function_templates) {
    const tpl = question.function_templates[language];
    if (tpl && tpl.driver) {
      finalCode = tpl.driver.replace('// USER_CODE_HERE', code);
    }
  }

  const { runAgainstTestcases } = await import('@/lib/services/judge.service');
  let judgeResult: any;
  try {
    judgeResult = await runAgainstTestcases(finalCode, language, testcases, question.time_limit || 2000);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Judge failed' }, { status: 500 });
  }

  const passedCount = judgeResult.testcases_passed;
  const allPassed = judgeResult.verdict === 'AC';

  // Check if already solved today (first-submission-per-day rule)
  const today = new Date().toISOString().split('T')[0];
  const { data: existing } = await supabase
    .from('user_qotd_submissions')
    .select('id, points_earned')
    .eq('user_id', session.user.id)
    .eq('question_id', question_id)
    .gte('submitted_at', `${today}T00:00:00.000Z`)
    .gt('points_earned', 0)
    .limit(1);

  const alreadyEarnedToday = existing && existing.length > 0;
  const points = allPassed && !alreadyEarnedToday ? 10 : 0;

  // Store submission
  await supabase.from('user_qotd_submissions').insert({
    user_id: session.user.id,
    question_id,
    code,
    language,
    passed_tests: passedCount,
    total_tests: judgeResult.testcases_total,
    points_earned: points,
  });

  if (points > 0) {
    await PointsService.awardPoints(
      adminSupabase,
      session.user.id,
      'qotd',
      points,
      `qotd:${question_id}`,
      `Solved QotD: ${question.title}`
    );
  }

  return NextResponse.json({
    ...judgeResult,
    points_earned: points,
    already_solved: alreadyEarnedToday,
  });
}
