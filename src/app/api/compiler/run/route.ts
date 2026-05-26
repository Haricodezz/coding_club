import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { executePiston } from '@/lib/piston';

// POST /api/compiler/run
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { code, language, stdin = '' } = body;

    if (!code || !language) {
      return NextResponse.json({ error: 'code and language are required' }, { status: 400 });
    }

    if (code.length > 50000) {
      return NextResponse.json({ error: 'Code exceeds 50KB limit' }, { status: 400 });
    }

    const result = await executePiston(code, language, stdin);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { success: false, error: 'Server error', message: String(err) },
      { status: 500 }
    );
  }
}
