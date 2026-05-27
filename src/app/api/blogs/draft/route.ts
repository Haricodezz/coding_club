import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    + '-' + Date.now();
}

// POST /api/blogs/draft — create or update a draft
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const sb = supabase as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, title, content, summary, cover_image, tags } = body;

  if (!title || !content) {
    return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
  }

  if (id) {
    // Update existing draft (must own it and be draft/rejected)
    const { data: existing } = await sb
      .from('user_blogs')
      .select('id, author_id, status')
      .eq('id', id)
      .single();

    if (!existing || existing.author_id !== user.id) {
      return NextResponse.json({ error: 'Not found or forbidden' }, { status: 403 });
    }
    if (!['draft', 'rejected'].includes(existing.status)) {
      return NextResponse.json({ error: 'Cannot edit a submitted or approved blog' }, { status: 400 });
    }

    const { data, error } = await sb
      .from('user_blogs')
      .update({ title, content, summary, cover_image, tags: tags || [], status: 'draft' })
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ blog: data });
  } else {
    // Create new draft
    const slug = generateSlug(title);
    const { data, error } = await sb
      .from('user_blogs')
      .insert({ title, slug, content, summary, cover_image, tags: tags || [], author_id: user.id, status: 'draft' })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ blog: data }, { status: 201 });
  }
}
