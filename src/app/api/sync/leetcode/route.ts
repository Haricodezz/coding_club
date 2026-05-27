import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { LeetCodeService } from '@/lib/services/leetcode.service';
import { AnalyticsService } from '@/lib/services/analytics.service';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { leetcode_username, force } = body;

    if (!leetcode_username) {
      return NextResponse.json({ error: 'leetcode_username is required' }, { status: 400 });
    }

    const result = await LeetCodeService.syncUser(supabase, session.user.id, leetcode_username, force);

    if (!result.success) {
      return NextResponse.json({ error: result.error, cooldown: result.cooldown }, { status: 400 });
    }

    // Log Activity
    await AnalyticsService.logActivity(supabase, session.user.id, 'sync_leetcode', {
      username: leetcode_username,
      points_earned: result.points
    });

    return NextResponse.json({ success: true, data: result.data, points: result.points, breakdown: result.breakdown });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
