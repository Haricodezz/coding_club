import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getPublishedContests } from '@/lib/services/contest.service';

// GET /api/contests — public listing of all published contests
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const contests = await getPublishedContests(supabase);
    return NextResponse.json({ data: contests });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
