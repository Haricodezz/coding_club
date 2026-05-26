import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server';
import { CsvImportService, CsvUserRow } from '@/lib/services/csv-import.service';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: user } = await supabase.from('users').select('role').eq('id', session.user.id).single();
    if (!user || !['super_admin', 'team'].includes(user.role as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { rows, filename } = body as { rows: CsvUserRow[], filename: string };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Invalid rows provided' }, { status: 400 });
    }

    // Use admin client for creating users
    const adminSupabase = createAdminSupabaseClient();
    const result = await CsvImportService.executeImport(adminSupabase, session.user.id, rows, filename || 'bulk_import.csv');

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
