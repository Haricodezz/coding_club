import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: currentUser } = await supabase.from('users').select('role').eq('id', session.user.id).single();
    if (!currentUser || !['super_admin', 'team'].includes(currentUser.role as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body as { action: 'suspend' | 'pause' | 'terminate' | 'activate' };

    if (!action) {
      return NextResponse.json({ error: 'Missing action' }, { status: 400 });
    }

    // Check target user
    const { data: targetUser } = await supabase.from('users').select('role').eq('id', id).single();
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (targetUser.role === 'super_admin') {
      return NextResponse.json({ error: 'Cannot restrict super_admin accounts' }, { status: 403 });
    }

    if (currentUser.role === 'team' && targetUser.role === 'team') {
      return NextResponse.json({ error: 'Team members cannot restrict other team members' }, { status: 403 });
    }

    const adminSupabase = createAdminSupabaseClient();

    if (action === 'terminate') {
      if (currentUser.role === 'team') {
        return NextResponse.json({ error: 'Team members are not allowed to terminate users' }, { status: 403 });
      }
      // Delete user
      const { error } = await adminSupabase.auth.admin.deleteUser(id);
      if (error) throw error;
      return NextResponse.json({ success: true, message: 'User terminated' });
    } 
    
    if (action === 'suspend' || action === 'pause') {
      // Ban for roughly 100 years
      const { error } = await adminSupabase.auth.admin.updateUserById(id, { ban_duration: '876000h' });
      if (error) throw error;
      return NextResponse.json({ success: true, message: 'User suspended' });
    }

    if (action === 'activate') {
      // Remove ban
      const { error } = await adminSupabase.auth.admin.updateUserById(id, { ban_duration: 'none' });
      if (error) throw error;
      return NextResponse.json({ success: true, message: 'User activated' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
