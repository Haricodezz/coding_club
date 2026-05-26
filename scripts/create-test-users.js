const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const lines = fs.readFileSync(envPath, 'utf8').split('\n');
for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const [key, ...val] = trimmed.split('=');
    process.env[key.trim()] = val.join('=').trim();
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function createUser(email, username, password, batch_id) {
  console.log(`Creating ${email}...`);
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authErr) {
    if (authErr.message.includes('already registered')) {
      console.log(`✅ ${email} already exists.`);
      return;
    }
    console.error(`❌ Failed auth: ${authErr.message}`);
    return;
  }

  const { error: profileErr } = await supabase.from('users').insert({
    id: authData.user.id,
    email,
    username,
    batch_id,
    avatar_url: 'avatar_0.svg',
    platform_points: 0,
  });

  if (profileErr) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    console.error(`❌ Profile failed: ${profileErr.message}`);
    console.error('👉 IMPORTANT: This means you have not run the schema.sql code in your Supabase SQL Editor yet!');
  } else {
    console.log(`✅ Success! Login: ${email} | Password: ${password}`);
  }
}

async function main() {
  await createUser('admin@club.local', 'Admin', 'admin1234', 'Admins');
  await createUser('student@club.local', 'Student', 'student1234', 'Batch_01');
}

main();
