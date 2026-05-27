import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server';
import { getContestBySlug, isParticipant, getContestProblems } from '@/lib/services/contest.service';
import { runAgainstTestcases } from '@/lib/services/judge.service';
import { checkRateLimit, createSubmission, hasSolved } from '@/lib/services/submission.service';
import { updateContestLeaderboard } from '@/lib/services/leaderboard.service';
import { PointsService } from '@/lib/services/points.service';
import { LANGUAGES } from '@/lib/piston';

// Rate: max 1 submission / 30s / user / problem (enforced in submission.service.ts)

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    // ── 1. Auth ──────────────────────────────────────────────
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── 2. Parse body ─────────────────────────────────────────
    const body = await req.json().catch(() => null);
    if (!body?.problem_slug || !body?.language || !body?.code) {
      return NextResponse.json({ error: 'Missing required fields: problem_slug, language, code' }, { status: 400 });
    }

    const { problem_slug, language, code } = body;

    // Validate language
    if (!LANGUAGES.find(l => l.id === language)) {
      return NextResponse.json({ error: `Unsupported language: ${language}` }, { status: 400 });
    }

    // ── 3. Load contest ────────────────────────────────────────
    const contest = await getContestBySlug(supabase, slug);
    if (!contest) return NextResponse.json({ error: 'Contest not found' }, { status: 404 });
    if (!contest.is_published) return NextResponse.json({ error: 'Contest not published' }, { status: 403 });

    const now = new Date();
    const start = new Date(contest.start_time);
    const end = new Date(contest.end_time);
    const isPractice = contest.practice_mode && now > end;
    const isActive = now >= start && now <= end;

    if (!isActive && !isPractice) {
      return NextResponse.json({ error: 'Contest is not active' }, { status: 403 });
    }

    // ── 4. Check participation ─────────────────────────────────
    const participating = await isParticipant(supabase, contest.id, user.id);
    if (!participating) {
      return NextResponse.json({ error: 'You have not joined this contest' }, { status: 403 });
    }

    // ── 5. Find problem ────────────────────────────────────────
    const problems = await getContestProblems(supabase, contest.id);
    const problem = problems.find((p: any) => p.slug === problem_slug);
    if (!problem) return NextResponse.json({ error: 'Problem not found in this contest' }, { status: 404 });
    if (problem.isLocked) return NextResponse.json({ error: 'Problem is locked' }, { status: 403 });

    // ── 6. Rate limit ──────────────────────────────────────────
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

    // ── 7. Fetch hidden testcases (ADMIN CLIENT — never exposed to browser) ──
    const adminSupabase = await createAdminSupabaseClient();
    const { data: testcases, error: tcErr } = await (adminSupabase as any)
      .from('problem_testcases')
      .select('id, input, expected_output, is_hidden')
      .eq('problem_id', problem.id)
      .order('display_order', { ascending: true });

    if (tcErr) throw new Error(tcErr.message);
    if (!testcases || testcases.length === 0) {
      return NextResponse.json({ error: 'No testcases configured for this problem' }, { status: 500 });
    }

    // ── 9. Count wrong attempts before this submission ─────────
    const { data: prevSubs } = await (supabase as any)
      .from('contest_submissions')
      .select('id')
      .eq('user_id', user.id)
      .eq('problem_id', problem.id)
      .eq('contest_id', contest.id)
      .neq('verdict', 'AC');

    const wrongAttempts = prevSubs?.length || 0;

    // ── 10. Store submission as PENDING ───────────────────────────────────
    const { id: submissionId } = await createSubmission(supabase, {
      contest_id:       contest.id,
      problem_id:       problem.id,
      user_id:          user.id,
      language,
      code,
      verdict:          'PENDING',
      runtime_ms:       0,
      testcases_total:  testcases.length,
      testcases_passed: 0,
    });

    // ── 11. Enqueue ─────────────────────────────────────────────
    const { enqueueSubmission, markJudgeStarted, markJudgeDone, markJudgeFailed, logJudgeEvent } = await import('@/lib/services/queue.service');
    let queueId: string | undefined;
    try {
      const { data: qData } = await (adminSupabase as any).from('submission_queue').insert({ submission_id: submissionId, status: 'PENDING' }).select('id').single();
      queueId = qData?.id;
    } catch (e) { console.error('Queue err:', e); }

    // ── 12. Judge (Synchronous for now, simulates worker) ────────
    if (queueId) await markJudgeStarted(adminSupabase, queueId);
    
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
      if (queueId) await markJudgeDone(adminSupabase, queueId);
    } catch (e: any) {
      if (queueId) await markJudgeFailed(adminSupabase, queueId, e.message);
      await logJudgeEvent(adminSupabase, 'ERROR', `Judge crashed: ${e.message}`, submissionId);
      throw e;
    }

    // ── 13. (wrongAttempts already counted) ─────────

    // ── 14. Update submission ───────────────────────────────────
    const { updateSubmission } = await import('@/lib/services/submission.service');
    await updateSubmission(adminSupabase, submissionId, {
      verdict:          judgeResult.verdict,
      runtime_ms:       judgeResult.runtime_ms,
      testcases_total:  judgeResult.testcases_total,
      testcases_passed: judgeResult.testcases_passed,
      error_message:    judgeResult.error_message,
      compile_output:   judgeResult.compile_output,
    });

    // ── 15. On AC: update leaderboard + award points ───────────
    if (judgeResult.verdict === 'AC' && !isPractice) {
      const alreadySolved = await hasSolved(adminSupabase, user.id, problem.id, contest.id);
      // Only update leaderboard on FIRST accepted solution
      if (!alreadySolved) {
        await updateContestLeaderboard(adminSupabase, {
          contestId:    contest.id,
          userId:       user.id,
          problemId:    problem.id,
          problemLabel: problem.label,
          points:       problem.points,
          solvedAt:     new Date().toISOString(),
          attempts:     wrongAttempts,
          runtimeMs:    judgeResult.runtime_ms,
          startTime:    contest.start_time,
        });

        await PointsService.awardPoints(
          adminSupabase,
          user.id,
          'contest',
          Math.round(problem.points * 0.8),
          `${contest.id}:${problem.id}`,
          `Solved ${problem.title} in ${contest.title}`,
        );
      }
    }

    // ── 16. Return verdict (hide hidden testcase details) ──────
    const publicResults = judgeResult.results.map((r: any) => ({
      testcase_id:     r.testcase_id,
      passed:          r.passed,
      verdict:         r.verdict,
      runtime_ms:      r.runtime_ms,
      // Never expose hidden expected outputs
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
      error_message:    judgeResult.verdict === 'CE' || judgeResult.verdict === 'RE'
        ? judgeResult.error_message
        : undefined,
      compile_output:   judgeResult.verdict === 'CE' ? judgeResult.compile_output : undefined,
      results:          publicResults,
    });

  } catch (err: any) {
    console.error('[SUBMIT ERROR]', err);
    return NextResponse.json({ error: 'Internal server error', detail: err.message }, { status: 500 });
  }
}
