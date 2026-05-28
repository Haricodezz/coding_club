// ============================================================
// Submission Service — Create, rate-limit, history
// SERVER-SIDE ONLY
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js';
import type { Verdict } from './judge.service';

const RATE_LIMIT_SECONDS = 30; // 1 submission per 30 seconds per user per problem

export interface SubmissionPayload {
  contest_id?:      string | null;
  problem_id:       string;
  user_id:          string;
  language:         string;
  code:             string;
  verdict:          Verdict;
  runtime_ms:       number;
  testcases_total:  number;
  testcases_passed: number;
  error_message?:   string;
  compile_output?:  string;
}

// -----------------------------------------------
// Check rate limit — throws if too soon
// -----------------------------------------------
export async function checkRateLimit(
  supabase: SupabaseClient<any, 'public', any>,
  userId: string,
  problemId: string,
): Promise<void> {
  const since = new Date(Date.now() - RATE_LIMIT_SECONDS * 1000).toISOString();

  const { data } = await (supabase as any)
    .from('contest_submissions')
    .select('submitted_at')
    .eq('user_id', userId)
    .eq('problem_id', problemId)
    .gte('submitted_at', since)
    .order('submitted_at', { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    const lastAt = new Date(data[0].submitted_at).getTime();
    const waitMs = RATE_LIMIT_SECONDS * 1000 - (Date.now() - lastAt);
    const waitSecs = Math.ceil(waitMs / 1000);
    throw new Error(`RATE_LIMIT:${waitSecs}`);
  }
}

// -----------------------------------------------
// Create a submission record
// -----------------------------------------------
export async function createSubmission(
  supabase: SupabaseClient<any, 'public', any>,
  payload: SubmissionPayload,
): Promise<{ id: string }> {
  const { data, error } = await (supabase as any)
    .from('contest_submissions')
    .insert({
      contest_id:       payload.contest_id || null,
      problem_id:       payload.problem_id,
      user_id:          payload.user_id,
      language:         payload.language,
      code:             payload.code,
      verdict:          payload.verdict,
      runtime_ms:       payload.runtime_ms,
      testcases_total:  payload.testcases_total,
      testcases_passed: payload.testcases_passed,
      error_message:    payload.error_message || null,
      compile_output:   payload.compile_output || null,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return { id: data.id };
}

// -----------------------------------------------
// Get user's submissions for a contest
// -----------------------------------------------
export async function getUserSubmissions(
  supabase: SupabaseClient<any, 'public', any>,
  contestId: string,
  userId: string,
  problemId?: string,
) {
  let query = (supabase as any)
    .from('contest_submissions')
    .select(`
      id, language, verdict, runtime_ms, testcases_total, testcases_passed,
      error_message, compile_output, submitted_at,
      question_bank(slug, title)
    `)
    .eq('contest_id', contestId)
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false });

  if (problemId) query = query.eq('problem_id', problemId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

// -----------------------------------------------
// Get all submissions for a contest (admin)
// -----------------------------------------------
export async function getAllContestSubmissions(
  supabase: SupabaseClient<any, 'public', any>,
  contestId: string,
  limit = 100,
) {
  const { data, error } = await (supabase as any)
    .from('contest_submissions')
    .select(`
      id, language, verdict, runtime_ms, submitted_at,
      users(display_name, username),
      question_bank(title, slug)
    `)
    .eq('contest_id', contestId)
    .order('submitted_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data || [];
}

// -----------------------------------------------
// Check if user has already solved a problem (AC exists)
// -----------------------------------------------
export async function hasSolved(
  supabase: SupabaseClient<any, 'public', any>,
  userId: string,
  problemId: string,
  contestId?: string | null,
): Promise<boolean> {
  let query = (supabase as any)
    .from('contest_submissions')
    .select('id')
    .eq('user_id', userId)
    .eq('problem_id', problemId)
    .eq('verdict', 'AC');
    
  if (contestId) {
    query = query.eq('contest_id', contestId);
  } else {
    query = query.is('contest_id', null);
  }

  const { data } = await query.limit(1);

  return !!(data && data.length > 0);
}

// -----------------------------------------------
// Update a submission record (async judge)
// -----------------------------------------------
export async function updateSubmission(
  supabase: SupabaseClient<any, 'public', any>,
  submissionId: string,
  payload: Partial<SubmissionPayload>,
) {
  const { error } = await (supabase as any)
    .from('contest_submissions')
    .update(payload)
    .eq('id', submissionId);

  if (error) throw new Error(error.message);
}
