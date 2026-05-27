import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { runSamples } from '@/lib/services/judge.service';
import { LANGUAGES } from '@/lib/piston';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body?.problem_slug || !body?.language || !body?.code) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const { problem_slug, language, code } = body;
    if (!LANGUAGES.find(l => l.id === language)) {
      return NextResponse.json({ error: `Unsupported language: ${language}` }, { status: 400 });
    }

    // Find the problem globally
    const { data: problem, error: pErr } = await (supabase as any)
      .from('question_bank')
      .select('*')
      .eq('slug', problem_slug)
      .eq('available_for_practice', true)
      .eq('is_published', true)
      .single();

    if (pErr || !problem) return NextResponse.json({ error: 'Problem not found or not public' }, { status: 404 });

    // Only fetch VISIBLE testcases for "Run" (no hidden)
    const { data: testcases, error: tcErr } = await (supabase as any)
      .from('question_bank_testcases')
      .select('id, input, expected_output, is_hidden, explanation')
      .eq('question_id', problem.id)
      .eq('is_hidden', false)
      .order('display_order', { ascending: true });

    if (tcErr) throw new Error(tcErr.message);
    if (!testcases || testcases.length === 0) {
      return NextResponse.json({ error: 'No sample testcases available' }, { status: 404 });
    }

    let finalCode = code;
    if (problem.execution_mode === 'function' && problem.function_templates) {
      const tpl = problem.function_templates[language];
      if (tpl && tpl.driver) {
        finalCode = tpl.driver.replace('// USER_CODE_HERE', code);
      }
    }

    const result = await runSamples(finalCode, language, testcases, problem.time_limit || 5000);

    return NextResponse.json({
      verdict:          result.verdict,
      runtime_ms:       result.runtime_ms,
      testcases_total:  result.testcases_total,
      testcases_passed: result.testcases_passed,
      error_message:    result.error_message,
      compile_output:   result.compile_output,
      results: result.results.map(r => ({
        passed:          r.passed,
        verdict:         r.verdict,
        actual_output:   r.actual_output,
        expected_output: r.expected_output,
        runtime_ms:      r.runtime_ms,
      })),
    });
  } catch (err: any) {
    console.error('[PRACTICE RUN ERROR]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
