import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
supabase.from('cms_homepage_sections').select('section_key, content_data').then(res => console.log(JSON.stringify(res.data, null, 2)));
