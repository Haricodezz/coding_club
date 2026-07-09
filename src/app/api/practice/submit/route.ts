import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server';
import { runAgainstTestcases } from '@/lib/services/judge.service';
import { checkRateLimit, createSubmission, hasSolved } from '@/lib/services/submission.service';
import { PointsService } from '@/lib/services/points.service';
import { LANGUAGES } from '@/lib/piston';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body?.problem_slug || !body?.language || !body?.code) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { problem_slug, language, code } = body;
    if (!LANGUAGES.find(l => l.id === language)) {
      return NextResponse.json({ error: `Unsupported language: ${language}` }, { status: 400 });
    }

    const { data: problem, error: pErr } = await (supabase as any)
      .from('question_bank')
      .select('*')
      .eq('slug', problem_slug)
      .eq('available_for_practice', true)
      .eq('is_published', true)
      .single();

    if (pErr || !problem) return NextResponse.json({ error: 'Problem not found' }, { status: 404 });

    try {
      await checkRateLimit(supabase, user.id, problem.id);
    } catch (err: any) {
      if (err.message?.startsWith('RATE_LIMIT:')) {
        const secs = err.message.split(':')[1];
        return NextResponse.json(
          { error: `Please wait ${secs} seconds before submitting again.` },
          { status: 429, headers: { 'Retry-After': secs } }
        );
      }
      throw err;
    }

    const adminSupabase = await createAdminSupabaseClient();
    const { data: testcases, error: tcErr } = await (adminSupabase as any)
      .from('question_bank_testcases')
      .select('id, input, expected_output, is_hidden')
      .eq('question_id', problem.id)
      .order('display_order', { ascending: true });

    if (tcErr) throw new Error(tcErr.message);
    if (!testcases || testcases.length === 0) {
      return NextResponse.json({ error: 'No testcases configured for this problem' }, { status: 500 });
    }

    const { id: submissionId } = await createSubmission(supabase, {
      contest_id:       null, // Explicitly null for practice
      problem_id:       problem.id,
      user_id:          user.id,
      language,
      code,
      verdict:          'PENDING',
      runtime_ms:       0,
      testcases_total:  testcases.length,
      testcases_passed: 0,
    });

    let queueId: string | undefined;
    try {
      const { data: qData } = await (adminSupabase as any).from('submission_queue').insert({ submission_id: submissionId, status: 'PENDING' }).select('id').single();
      queueId = qData?.id;
    } catch (e) { console.error('Queue err:', e); }

    if (queueId) {
      await (adminSupabase as any).from('submission_queue').update({ status: 'JUDGING', judge_started: new Date().toISOString() }).eq('id', queueId);
    }
    
    let finalCode = code;
    if (problem.execution_mode === 'function' && problem.function_templates) {
      const tpl = problem.function_templates[language];
      if (tpl && tpl.driver) {
        finalCode = tpl.driver.replace('// USER_CODE_HERE', code);
      }
    }

    let judgeResult: any;
    try {
      judgeResult = await runAgainstTestcases(finalCode, language, testcases, problem.time_limit || 2000);
      if (queueId) {
        await (adminSupabase as any).from('submission_queue').update({ status: 'DONE', judge_done: new Date().toISOString() }).eq('id', queueId);
      }
    } catch (e: any) {
      if (queueId) {
        await (adminSupabase as any).from('submission_queue').update({ status: 'FAILED', judge_done: new Date().toISOString(), error_detail: e.message }).eq('id', queueId);
      }
      await (adminSupabase as any).from('judge_logs').insert({ level: 'ERROR', message: `Judge crashed: ${e.message}`, submission_id: submissionId });
      throw e;
    }

    const { updateSubmission } = await import('@/lib/services/submission.service');
    await updateSubmission(adminSupabase, submissionId, {
      verdict:          judgeResult.verdict,
      runtime_ms:       judgeResult.runtime_ms,
      testcases_total:  judgeResult.testcases_total,
      testcases_passed: judgeResult.testcases_passed,
      error_message:    judgeResult.error_message,
      compile_output:   judgeResult.compile_output,
    });

    if (judgeResult.verdict === 'AC') {
      const alreadySolved = await hasSolved(adminSupabase, user.id, problem.id);
      if (!alreadySolved) {
        await PointsService.awardPoints(
          adminSupabase,
          user.id,
          'practice', // Category: practice
          problem.points,
          `practice:${problem.id}`,
          `Solved ${problem.title} (Practice)`,
        );
      }
    }

    const publicResults = judgeResult.results.map((r: any) => ({
      testcase_id:     r.testcase_id,
      passed:          r.passed,
      verdict:         r.verdict,
      runtime_ms:      r.runtime_ms,
      actual_output:   r.is_hidden ? undefined : r.actual_output,
      expected_output: r.is_hidden ? undefined : r.expected_output,
      is_hidden:       r.is_hidden,
    }));

    return NextResponse.json({
      submission_id:    submissionId,
      verdict:          judgeResult.verdict,
      runtime_ms:       judgeResult.runtime_ms,
      testcases_total:  judgeResult.testcases_total,
      testcases_passed: judgeResult.testcases_passed,
      error_message:    judgeResult.verdict === 'CE' || judgeResult.verdict === 'RE' ? judgeResult.error_message : undefined,
      compile_output:   judgeResult.verdict === 'CE' ? judgeResult.compile_output : undefined,
      results:          publicResults,
    });

  } catch (err: any) {
    console.error('[PRACTICE SUBMIT ERROR]', err);
    return NextResponse.json({ error: 'Internal server error', detail: err.message }, { status: 500 });
  }
}
