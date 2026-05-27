import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// GET /api/blogs/my — fetch current user's blogs
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const sb = supabase as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await sb
    .from('user_blogs')
    .select('id, title, slug, summary, status, rejection_note, is_featured, created_at, updated_at, tags, cover_image')
    .eq('author_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ blogs: data });
}

