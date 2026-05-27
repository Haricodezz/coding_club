import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase-server';

// POST /api/auth/register
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch requester role
    const { data: requester } = await supabase.from('users').select('role').eq('id', session.user.id).single();
    if (!requester || (requester.role !== 'super_admin' && requester.role !== 'team')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();
    const { email, password, username, batch_id, role = 'student' } = body;

    if (!email || !password || !username) {
      return NextResponse.json({ error: 'email, password, username are required' }, { status: 400 });
    }

    // Role hierarchy check: team can only create students
    if (requester.role === 'team' && role !== 'student') {
      return NextResponse.json({ error: 'Forbidden: Team members can only create student accounts' }, { status: 403 });
    }

    const admin = createAdminSupabaseClient();

    // Pre-flight: Check for duplicate username or email in the public users table
    const { data: existing } = await (admin as any)
      .from('users')
      .select('id, username, email')
      .or(`username.eq.${username.toLowerCase()},email.eq.${email}`)
      .maybeSingle();

    if (existing) {
      if (existing.email === email) {
        return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
      }
      if (existing.username === username.toLowerCase()) {
        return NextResponse.json({ error: 'Username is already taken. Please choose another.' }, { status: 409 });
      }
    }

    // Create auth user
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || 'Failed to create user' }, { status: 400 });
    }

    // Upsert user profile row — a DB trigger may have already inserted a row
    // for this user's id when the auth user was created, so we use upsert to
    // avoid "duplicate key value violates unique constraint users_pkey".
    const { error: profileError } = await (admin as any).from('users').upsert({
      id: authData.user.id,
      email,
      username: username.toLowerCase(),
      batch_id: batch_id || null,
      role,
      avatar_url: 'avatar_0.svg',
      platform_profiles: {},
      platform_stats: {},
      platform_points: 0,
    }, { onConflict: 'id' });

    if (profileError) {
      // Rollback auth user on failure
      await admin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({ message: 'User created successfully', userId: authData.user.id }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
