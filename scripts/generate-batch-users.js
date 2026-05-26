#!/usr/bin/env node
/**
 * Coding Club — Batch User Generation Script
 * Usage: node scripts/generate-batch-users.js --count=200 --output=logins.csv
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// -----------------------------------------------
// Load .env.local manually (no dotenv dependency)
// -----------------------------------------------
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌  .env.local not found. Copy .env.local.example and fill in values.');
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    process.env[key] = value;
  }
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || SUPABASE_URL.includes('placeholder')) {
  console.error('❌  NEXT_PUBLIC_SUPABASE_URL not set or is still placeholder. Update .env.local');
  process.exit(1);
}
if (!SERVICE_ROLE_KEY || SERVICE_ROLE_KEY.includes('placeholder')) {
  console.error('❌  SUPABASE_SERVICE_ROLE_KEY not set. This is required for admin operations.');
  process.exit(1);
}

// -----------------------------------------------
// Parse CLI args
// -----------------------------------------------
const args = Object.fromEntries(
  process.argv.slice(2).map(arg => {
    const [key, val] = arg.replace('--', '').split('=');
    return [key, val];
  })
);

const COUNT = parseInt(args.count || '200', 10);
const OUTPUT = args.output || 'logins.csv';
const BATCH_PREFIX = args.batch || 'batch';

// -----------------------------------------------
// Password generation (cryptographically secure)
// -----------------------------------------------
function generatePassword(length = 20) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes).map(b => chars[b % chars.length]).join('');
}

function padNum(n, width = 3) {
  return String(n).padStart(width, '0');
}

// -----------------------------------------------
// Main
// -----------------------------------------------
async function main() {
  console.log(`\n🚀 Generating ${COUNT} batch users...\n`);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const csvRows = ['batch_id,email,username,password,avatar_url'];
  const errors = [];
  let created = 0;

  // Process in batches of 10 to avoid rate limiting
  const CHUNK = 10;
  for (let i = 1; i <= COUNT; i += CHUNK) {
    const chunk = Math.min(CHUNK, COUNT - i + 1);
    await Promise.all(
      Array.from({ length: chunk }, async (_, j) => {
        const num = i + j;
        const paddedNum = padNum(num);
        const batchId = `${BATCH_PREFIX}_${paddedNum}`;
        const username = `user_${paddedNum}`;
        const email = `${username}@club.local`;
        const password = generatePassword();
        const avatarIdx = (num - 1) % 20;
        const avatarUrl = `avatar_${avatarIdx}.svg`;

        try {
          // Create auth user
          const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
          });

          if (authErr) {
            if (authErr.message.includes('already registered')) {
              console.log(`  ⚠️  User ${email} already exists — skipping`);
            } else {
              errors.push({ num, email, error: authErr.message });
              console.error(`  ❌ Failed to create ${email}: ${authErr.message}`);
            }
            return;
          }

          // Create user profile
          const { error: profileErr } = await supabase.from('users').insert({
            id: authData.user.id,
            email,
            username,
            batch_id: batchId,
            avatar_url: avatarUrl,
            platform_profiles: {},
            platform_stats: {},
            platform_points: 0,
          });

          if (profileErr) {
            errors.push({ num, email, error: profileErr.message });
            console.error(`  ❌ Profile creation failed for ${email}: ${profileErr.message}`);
            // Rollback
            await supabase.auth.admin.deleteUser(authData.user.id);
            return;
          }

          csvRows.push(`${batchId},${email},${username},${password},${avatarUrl}`);
          created++;
          process.stdout.write(`  ✅ ${created}/${COUNT} — ${username}\r`);
        } catch (err) {
          errors.push({ num, email, error: String(err) });
        }
      })
    );

    // Small delay between chunks
    if (i + CHUNK <= COUNT) await new Promise(r => setTimeout(r, 500));
  }

  // Write CSV
  const outputPath = path.join(process.cwd(), OUTPUT);
  fs.writeFileSync(outputPath, csvRows.join('\n'), 'utf8');

  console.log('\n\n📊 Summary:');
  console.log(`  ✅ Created: ${created} users`);
  console.log(`  ❌ Failed:  ${errors.length} users`);
  console.log(`  📄 Saved:   ${outputPath}`);

  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach(e => console.log(`  - User ${e.num} (${e.email}): ${e.error}`));
  }

  console.log('\n🎉 Done! Share the CSV with students. Keep it secure — it contains plaintext passwords.');
  console.log('   ⚠️  Add logins.csv to .gitignore before committing!\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
