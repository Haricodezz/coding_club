const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  console.log('Fetching contest by slug test1-1...');
  const { data, error } = await supabase.from('contest_events').select('*').eq('slug', 'test1-1');
  console.log('contest_events:', { data, error });
  if (data && data.length > 0) {
    const { data: pMap, error: pErr } = await supabase.from('contest_problem_map').select('id, question_bank(id, slug, title)').eq('contest_id', data[0].id);
    console.log('contest_problem_map with question_bank:', JSON.stringify({ data: pMap, error: pErr }, null, 2));
  }
}
run();
