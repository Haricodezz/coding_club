import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// GET /api/qotd/today — fetch today's question
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const today = new Date().toISOString().split('T')[0];

  let { data, error } = await supabase
    .from('qotd_calendar')
    .select('question_id, question_bank(*)')
    .eq('date', today)
    .eq('is_active', true)
    .single();

  // Graceful fallback if schema wasn't migrated
  if (error && error.message.includes('Could not find')) {
    const res = await supabase
      .from('qotd_calendar')
      .select('question_id, questions(*)')
      .eq('date', today)
      .eq('is_active', true)
      .single();
    data = res.data;
    error = res.error;
    if (data && data.questions) {
      data.question_bank = data.questions;
    }
  }

  if (error || !data || !data.question_bank) {
    return NextResponse.json({ error: 'No question scheduled for today' }, { status: 404 });
  }

  return NextResponse.json({ data: data.question_bank, date: today });
}
