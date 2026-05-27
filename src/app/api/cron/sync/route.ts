import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { LeetCodeService } from '@/lib/services/leetcode.service';

// To be called by Vercel Cron or external scheduler
// Rate limit batching: fetch 10 users whose cooldown has expired
export async function GET(req: NextRequest) {
  try {
    // Optionally secure this endpoint with a secret
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    // Fetch users whose cooldown has passed or never synced, limit to 10 per cron run
    const { data: users, error } = await (supabase as any)
      .from('user_platform_stats')
      .select('user_id, platform, sync_cooldown_until, users(leetcode_username)')
      .eq('platform', 'leetcode')
      .or(`sync_cooldown_until.lte.${new Date().toISOString()},sync_cooldown_until.is.null`)
      .limit(10);

    if (error || !users) {
      return NextResponse.json({ error: 'Failed to fetch users for sync' }, { status: 500 });
    }

    const results = [];
    for (const u of users as any[]) {
      // Type assertion since it's a join
      const userData = u.users as any;
      if (userData?.leetcode_username) {
        const result = await LeetCodeService.syncUser(supabase, u.user_id, userData.leetcode_username, false);
        results.push({ username: userData.leetcode_username, success: result.success });
        
        // Sleep 1s to prevent bursting the proxy api
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    return NextResponse.json({ success: true, processed: results.length, results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
