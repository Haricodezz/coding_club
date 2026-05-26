import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { executePiston } from '@/lib/piston';
import type { TestCase, TestCaseResult } from '@/types';

// POST /api/qotd/submit
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { code, language, question_id } = await req.json();
  if (!code || !language || !question_id) {
    return NextResponse.json({ error: 'code, language, question_id required' }, { status: 400 });
  }

  // Fetch the question + test cases
  const { data: question, error: qErr } = await supabase
    .from('questions')
    .select('*')
    .eq('id', question_id)
    .eq('is_published', true)
    .single();

  if (qErr || !question) return NextResponse.json({ error: 'Question not found' }, { status: 404 });

  const testCases: TestCase[] = (question.test_cases as unknown as TestCase[]) || [];
  const results: TestCaseResult[] = [];

  // Run code against each test case
  for (const tc of testCases) {
    const result = await executePiston(code, language, tc.input);
    const actual = (result.output || '').trim();
    const expected = tc.expected_output.trim();
    results.push({
      passed: actual === expected,
      input: tc.input,
      expected,
      actual,
      stderr: result.stderr,
    });
  }

  const passedCount = results.filter(r => r.passed).length;
  const allPassed = passedCount === testCases.length;

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
    total_tests: testCases.length,
    points_earned: points,
  });

  return NextResponse.json({
    results,
    passed: passedCount,
    total: testCases.length,
    all_passed: allPassed,
    points_earned: points,
    already_solved: alreadyEarnedToday,
  });
}
