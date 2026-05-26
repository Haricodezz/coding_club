import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { executePiston } from '@/lib/piston';
import type { TestCase } from '@/types';

// POST /api/questions/solve — run code against a custom question's test cases
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { code, language, question_id } = await req.json();
  if (!code || !language || !question_id) {
    return NextResponse.json({ error: 'code, language, question_id required' }, { status: 400 });
  }

  const { data: question } = await supabase
    .from('custom_questions')
    .select('*')
    .eq('id', question_id)
    .single();

  if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 });

  const testCases: TestCase[] = (question.test_cases as unknown as TestCase[]) || [];
  const results = [];

  for (const tc of testCases) {
    const result = await executePiston(code, language, tc.input);
    const actual = (result.output || '').trim();
    const expected = tc.expected_output.trim();
    results.push({ passed: actual === expected, input: tc.input, expected, actual, stderr: result.stderr });
  }

  const passedCount = results.filter(r => r.passed).length;
  return NextResponse.json({ results, passed: passedCount, total: testCases.length });
}
