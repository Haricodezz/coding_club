import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/blogs/submit — submit a draft for admin review
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const sb = supabase as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Blog ID required' }, { status: 400 });

  const { data: blog } = await sb
    .from('user_blogs')
    .select('id, author_id, status, title, content')
    .eq('id', id)
    .single();

  if (!blog || blog.author_id !== user.id) {
    return NextResponse.json({ error: 'Not found or forbidden' }, { status: 403 });
  }
  if (!['draft', 'rejected'].includes(blog.status)) {
    return NextResponse.json({ error: 'Blog is already pending or approved' }, { status: 400 });
  }
  if (!blog.title || !blog.content) {
    return NextResponse.json({ error: 'Title and content cannot be empty before submitting' }, { status: 400 });
  }

  const { data, error } = await sb
    .from('user_blogs')
    .update({ status: 'pending', rejection_note: null })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ blog: data, message: 'Blog submitted for admin review!' });
}
