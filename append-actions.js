const fs = require('fs');
const content = `
// ============================================================
// RESOURCE HUB CRUD
// ============================================================

export async function getResourceCoursesAdmin() {
  const { supabase } = await checkAdminAuth();
  const { data, error } = await supabase
    .from('resource_courses')
    .select('*, resource_modules(id, title, display_order, resource_items(id, title, is_published))')
    .order('display_order', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function saveResourceCourse(id: string | null, payload: any) {
  const { supabase, session } = await checkAdminAuth();
  const dataToSave = { ...payload, updated_at: new Date().toISOString() };
  let error, result;
  if (id) {
    const res = await supabase.from('resource_courses').update(dataToSave).eq('id', id).select().single();
    error = res.error; result = res.data;
  } else {
    dataToSave.created_by = session.user.id;
    const res = await supabase.from('resource_courses').insert({ ...dataToSave, created_at: new Date().toISOString() }).select().single();
    error = res.error; result = res.data;
  }
  if (error) throw new Error(error.message);
  revalidatePath('/resources');
  return result;
}

export async function deleteResourceCourse(id: string) {
  const { supabase } = await checkAdminAuth();
  const { error } = await supabase.from('resource_courses').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/resources');
}

export async function saveResourceModule(id: string | null, payload: any) {
  const { supabase } = await checkAdminAuth();
  let error, result;
  if (id) {
    const res = await supabase.from('resource_modules').update(payload).eq('id', id).select().single();
    error = res.error; result = res.data;
  } else {
    const res = await supabase.from('resource_modules').insert({ ...payload, created_at: new Date().toISOString() }).select().single();
    error = res.error; result = res.data;
  }
  if (error) throw new Error(error.message);
  revalidatePath('/resources');
  return result;
}

export async function deleteResourceModule(id: string) {
  const { supabase } = await checkAdminAuth();
  const { error } = await supabase.from('resource_modules').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/resources');
}

export async function saveResourceItem(id: string | null, payload: any) {
  const { supabase } = await checkAdminAuth();
  const dataToSave = { ...payload, updated_at: new Date().toISOString() };
  let error, result;
  if (id) {
    const res = await supabase.from('resource_items').update(dataToSave).eq('id', id).select().single();
    error = res.error; result = res.data;
  } else {
    const res = await supabase.from('resource_items').insert({ ...dataToSave, created_at: new Date().toISOString() }).select().single();
    error = res.error; result = res.data;
  }
  if (error) throw new Error(error.message);
  revalidatePath('/resources');
  return result;
}

export async function deleteResourceItem(id: string) {
  const { supabase } = await checkAdminAuth();
  const { error } = await supabase.from('resource_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/resources');
}
`;

fs.appendFileSync('src/app/admin/actions.ts', content);
console.log("Appended resource actions.");
