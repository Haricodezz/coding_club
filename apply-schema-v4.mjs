import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Use the REST API to run raw SQL via the supabase RPC approach
// Instead, we'll do each statement individually using the query builder's 
// low-level .rpc for raw SQL — but that requires a custom function.
// Easier: just apply the specific CREATE TABLE statements only.

async function applySchema() {
  console.log('Creating resource tables...');

  const stmts = [
    `CREATE TABLE IF NOT EXISTS public.resource_courses (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      slug VARCHAR UNIQUE NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      banner_url VARCHAR,
      difficulty_level VARCHAR(50) DEFAULT 'Beginner',
      is_published BOOLEAN DEFAULT FALSE,
      display_order INT DEFAULT 0,
      created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS public.resource_modules (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      course_id UUID REFERENCES public.resource_courses(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      display_order INT DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS public.resource_items (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      module_id UUID REFERENCES public.resource_modules(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR UNIQUE NOT NULL,
      description TEXT,
      topic_name VARCHAR(100),
      resource_type VARCHAR(50) NOT NULL,
      url VARCHAR NOT NULL,
      estimated_duration INT,
      difficulty VARCHAR(20) DEFAULT 'Beginner',
      display_order INT DEFAULT 0,
      is_published BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS public.resource_progress (
      user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
      item_id UUID REFERENCES public.resource_items(id) ON DELETE CASCADE,
      completed BOOLEAN DEFAULT FALSE,
      completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      PRIMARY KEY (user_id, item_id)
    )`,
    `CREATE TABLE IF NOT EXISTS public.resource_bookmarks (
      user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
      item_id UUID REFERENCES public.resource_items(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      PRIMARY KEY (user_id, item_id)
    )`,
    `ALTER TABLE public.resource_courses ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE public.resource_modules ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE public.resource_items ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE public.resource_progress ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE public.resource_bookmarks ENABLE ROW LEVEL SECURITY`,
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='resource_courses' AND policyname='Courses are publicly readable') THEN
        CREATE POLICY "Courses are publicly readable" ON public.resource_courses FOR SELECT USING (is_published = TRUE);
      END IF;
    END $$`,
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='resource_modules' AND policyname='Modules are publicly readable') THEN
        CREATE POLICY "Modules are publicly readable" ON public.resource_modules FOR SELECT USING (TRUE);
      END IF;
    END $$`,
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='resource_items' AND policyname='Items are publicly readable') THEN
        CREATE POLICY "Items are publicly readable" ON public.resource_items FOR SELECT USING (is_published = TRUE);
      END IF;
    END $$`,
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='resource_courses' AND policyname='Admin write courses') THEN
        CREATE POLICY "Admin write courses" ON public.resource_courses FOR ALL USING (
          EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'team'))
        );
      END IF;
    END $$`,
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='resource_modules' AND policyname='Admin write modules') THEN
        CREATE POLICY "Admin write modules" ON public.resource_modules FOR ALL USING (
          EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'team'))
        );
      END IF;
    END $$`,
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='resource_items' AND policyname='Admin write items') THEN
        CREATE POLICY "Admin write items" ON public.resource_items FOR ALL USING (
          EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'team'))
        );
      END IF;
    END $$`,
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='resource_progress' AND policyname='Users manage own progress') THEN
        CREATE POLICY "Users manage own progress" ON public.resource_progress FOR ALL USING (auth.uid() = user_id);
      END IF;
    END $$`,
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='resource_bookmarks' AND policyname='Users manage own bookmarks') THEN
        CREATE POLICY "Users manage own bookmarks" ON public.resource_bookmarks FOR ALL USING (auth.uid() = user_id);
      END IF;
    END $$`,
  ];

  for (const sql of stmts) {
    const { error } = await supabase.rpc('exec_sql_raw', { query: sql });
    if (error && !error.message.includes('already exists') && !error.message.includes('duplicate')) {
      console.warn('STMT WARN:', error.message.slice(0, 200));
    }
  }
}

// Bypass RPC (which may not exist) — use direct HTTP approach
// Actually the cleanest approach for Supabase is using the service role with 
// direct REST calls. Since there's no exec_sql_raw, we use @supabase/supabase-js
// with the `db` object approach not available directly.
// BEST APPROACH: Just insert rows — tables should already exist from SQL editor.
// Print instructions for the SQL instead.

console.log('\n📋 IMPORTANT: Before running seed-resources.mjs, you MUST run schema-v4.sql');
console.log('   in your Supabase Dashboard → SQL Editor → New Query → paste contents of:');
console.log('   supabase/schema-v4.sql\n');
console.log('   After that, run: node --env-file=.env.local seed-resources.mjs\n');
