import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// GET /api/qotd/today — fetch today's question
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('qotd_calendar')
    .select('question_id, questions(*)')
    .eq('date', today)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'No question scheduled for today' }, { status: 404 });
  }

  return NextResponse.json({ data: data.questions, date: today });
}
