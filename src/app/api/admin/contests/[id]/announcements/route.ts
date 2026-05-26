import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server';

async function requireAdmin(supabase: any) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const { data: u } = await supabase.from('users').select('role').eq('id', session.user.id).single();
  if (!u || !['super_admin', 'team'].includes(u.role)) throw new Error('FORBIDDEN');
  return session.user.id;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: contestId } = await params;
  try {
    const supabase = await createServerSupabaseClient();
    await requireAdmin(supabase);
    const adminSupabase = createAdminSupabaseClient();

    const { data, error } = await (adminSupabase as any)
      .from('contest_announcements')
      .select('id, title, body, created_at, created_by')
      .eq('contest_id', contestId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return NextResponse.json({ data: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: contestId } = await params;
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await requireAdmin(supabase);
    const adminSupabase = createAdminSupabaseClient();
    const { title, body } = await req.json();

    if (!title || !body) return NextResponse.json({ error: 'title and body required' }, { status: 400 });

    const { error } = await (adminSupabase as any)
      .from('contest_announcements')
      .insert({ contest_id: contestId, title, body, created_by: userId });

    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: contestId } = await params;
  try {
    const supabase = await createServerSupabaseClient();
    await requireAdmin(supabase);
    const adminSupabase = createAdminSupabaseClient();
    
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { error } = await (adminSupabase as any)
      .from('contest_announcements')
      .delete()
      .eq('id', id)
      .eq('contest_id', contestId);

    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
