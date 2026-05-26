import { createClient } from '@supabase/supabase-js';

async function updateSchema() {
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await adminSupabase.rpc('exec_sql', {
    sql: `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';`
  });

  if (error) {
    console.error('Error (might not have exec_sql RPC):', error);
  } else {
    console.log('Success');
  }
}

updateSchema();
