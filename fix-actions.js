const fs = require('fs');
const content = fs.readFileSync('src/app/admin/actions.ts', 'utf8');

const marker = "export async function deleteLearningPath(id: string) {\r\n  const { supabase } = await checkAdminAuth();\r\n  const { error } = await supabase.from('cms_learning_paths').delete().eq('id', id);\r\n  if (error) throw new Error(error.message);\r\n  revalidatePath('/learn');\r\n}";

let newContent = content.substring(0, content.indexOf(marker) + marker.length);

newContent += `

// ============================================================
// QUESTIONS CRUD
// ============================================================

export async function getQuestionsAdmin() {
  const { supabase } = await checkAdminAuth();
  const { data, error } = await supabase.from('questions').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function saveQuestion(id: number | null, payload: any) {
  const { supabase, session } = await checkAdminAuth();
  
  const dataToSave = {
    ...payload,
  };

  let error, result;
  if (id) {
    const res = await supabase.from('questions').update(dataToSave).eq('id', id).select().single();
    error = res.error; result = res.data;
  } else {
    dataToSave.author_id = session.user.id;
    const res = await supabase.from('questions').insert({ ...dataToSave, created_at: new Date().toISOString() }).select().single();
    error = res.error; result = res.data;
  }

  if (error) throw new Error(error.message);
  revalidatePath('/questions');
  return result;
}

export async function deleteQuestion(id: number) {
  const { supabase } = await checkAdminAuth();
  const { error } = await supabase.from('questions').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/questions');
}

// ============================================================
// QOTD CALENDAR CRUD
// ============================================================

export async function getQotdCalendarAdmin() {
  const { supabase } = await checkAdminAuth();
  const { data, error } = await supabase.from('qotd_calendar').select('*, questions(title)').order('date', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function saveQotd(date: string, payload: any) {
  const { supabase } = await checkAdminAuth();
  const { data, error } = await supabase.from('qotd_calendar').upsert({ date, ...payload }).select().single();
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard');
  return data;
}

export async function deleteQotd(date: string) {
  const { supabase } = await checkAdminAuth();
  const { error } = await supabase.from('qotd_calendar').delete().eq('date', date);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard');
}

// ============================================================
// LEADERBOARD ADMIN
// ============================================================

export async function getLeaderboardAdmin() {
  const { supabase } = await checkAdminAuth();
  const { data, error } = await supabase.from('leaderboard').select('*').order('total_points', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function refreshLeaderboardAdmin() {
  const { supabase } = await checkAdminAuth();
  const { error } = await supabase.rpc('refresh_leaderboard');
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard');
}
`;

fs.writeFileSync('src/app/admin/actions.ts', newContent);
console.log("Done");
