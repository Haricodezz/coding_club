import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// GET /api/learning/resources?category=DSA&difficulty=Beginner
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const difficulty = searchParams.get('difficulty');

  let query = supabase
    .from('learning_resources')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (category && category !== 'All') query = query.eq('category', category);
  if (difficulty && difficulty !== 'All') query = query.eq('difficulty', difficulty);

  const { data: resources, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If authenticated, merge completion status
  if (session) {
    const { data: progress } = await supabase
      .from('user_progress')
      .select('resource_id')
      .eq('user_id', session.user.id)
      .eq('completed', true);

    const completedIds = new Set((progress || []).map((p: { resource_id: number }) => p.resource_id));
    const enriched = (resources || []).map((r) => ({
      ...r,
      is_completed: completedIds.has(r.id),
    }));
    return NextResponse.json({ data: enriched });
  }

  return NextResponse.json({ data: resources || [] });
}
