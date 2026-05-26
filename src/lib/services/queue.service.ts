import { SupabaseClient } from '@supabase/supabase-js';

export async function enqueueSubmission(
  supabase: SupabaseClient<any, 'public', any>,
  submissionId: string
) {
  const { error } = await (supabase as any)
    .from('submission_queue')
    .insert({
      submission_id: submissionId,
      status: 'PENDING'
    });

  if (error) {
    // If it fails to queue, we log it but don't crash the submission, it just might not get picked up.
    console.error('Failed to enqueue submission:', error);
    throw new Error('Failed to enqueue submission');
  }
}

export async function markJudgeStarted(
  supabase: SupabaseClient<any, 'public', any>,
  queueId: string
) {
  await (supabase as any)
    .from('submission_queue')
    .update({ status: 'JUDGING', judge_started: new Date().toISOString() })
    .eq('id', queueId);
}

export async function markJudgeDone(
  supabase: SupabaseClient<any, 'public', any>,
  queueId: string
) {
  await (supabase as any)
    .from('submission_queue')
    .update({ status: 'DONE', judge_done: new Date().toISOString() })
    .eq('id', queueId);
}

export async function markJudgeFailed(
  supabase: SupabaseClient<any, 'public', any>,
  queueId: string,
  errorDetail: string
) {
  await (supabase as any)
    .from('submission_queue')
    .update({ status: 'FAILED', judge_done: new Date().toISOString(), error_detail: errorDetail })
    .eq('id', queueId);
}

export async function logJudgeEvent(
  supabase: SupabaseClient<any, 'public', any>,
  level: 'INFO' | 'WARN' | 'ERROR',
  message: string,
  submissionId?: string,
  details?: any
) {
  await (supabase as any)
    .from('judge_logs')
    .insert({
      level,
      message,
      submission_id: submissionId || null,
      details: details ? JSON.stringify(details) : null
    });
}
