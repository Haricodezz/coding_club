import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

async function requireAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!profile || !['super_admin', 'team'].includes(profile.role)) return null;
  return user;
}

// POST /api/admin/blogs/[id]/reject
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient();
  const sb = supabase as any;
  const admin = await requireAdmin(supabase);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { note } = await req.json();

  const { data, error } = await sb
    .from('user_blogs')
    .update({
      status: 'rejected',
      rejection_note: note || 'Did not meet publishing guidelines.',
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ blog: data, message: 'Blog rejected with note.' });
}
