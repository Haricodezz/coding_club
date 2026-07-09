import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase URL or Service Key. Use node --env-file=.env.local");
  process.exit(1);
}

const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetUsers() {
  console.log('Clearing public.users table first (to remove FK dependencies on auth.users)...');
  const { error: truncError } = await adminSupabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (truncError) {
    console.log('Error deleting from public.users:', truncError.message);
  } else {
    console.log('Cleared public.users table successfully.');
  }

  console.log('Fetching all users from auth...');
  let hasMore = true;
  let page = 1;
  let totalDeleted = 0;

  while (hasMore) {
    const { data: { users }, error: listError } = await adminSupabase.auth.admin.listUsers({ page, perPage: 1000 });
    
    if (listError) {
      console.error('Error fetching users:', listError);
      return;
    }
    
    if (users.length === 0) {
      hasMore = false;
      break;
    }

    console.log(`Found ${users.length} users on page ${page}. Deleting them...`);
    
    for (const user of users) {
      const { error: delError } = await adminSupabase.auth.admin.deleteUser(user.id);
      if (delError) {
        console.error(`Error deleting user ${user.id}:`, delError);
      } else {
        totalDeleted++;
      }
    }
    
    // If we couldn't delete some users, we might get stuck in an infinite loop
    // if we just stay on page 1. So if some weren't deleted, we increment the page.
    if (users.length > 0 && totalDeleted === 0) {
      page++; // move to next page to avoid infinite loop
    }
  }

  console.log(`Total deleted auth users: ${totalDeleted}`);

  console.log('Creating super admin...');
  const email = 'superadmin@bpmce.club';
  const password = '#bpmce@123!@#$%';
  
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    console.error('Failed to create super admin:', authError);
    return;
  }

  console.log('Upserting superadmin profile...');
  const { error: profileError } = await adminSupabase.from('users').upsert({
    id: authData.user.id,
    email,
    username: 'superadmin',
    role: 'super_admin',
    avatar_url: 'avatar_0.svg',
    platform_profiles: {},
    platform_stats: {},
    platform_points: 0,
  }, { onConflict: 'id' });

  if (profileError) {
    console.error('Error setting superadmin profile:', profileError);
  } else {
    console.log('Super admin created successfully!');
  }
}

resetUsers();
