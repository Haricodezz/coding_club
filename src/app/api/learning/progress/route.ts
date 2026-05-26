import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// POST /api/learning/progress — mark/unmark resource as completed
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { resource_id, completed } = await req.json();
  if (!resource_id) return NextResponse.json({ error: 'resource_id required' }, { status: 400 });

  const { error } = await supabase.from('user_progress').upsert({
    user_id: session.user.id,
    resource_id,
    completed,
    completion_date: completed ? new Date().toISOString() : null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ message: 'Progress updated', completed });
}
