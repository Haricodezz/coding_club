import { SupabaseClient } from '@supabase/supabase-js';
import { PointsService } from './points.service';

export class LeetCodeService {
  /**
   * Fetch from official GraphQL. If blocked, fallback to proxy API.
   */
  static async fetchStats(username: string) {
    try {
      // 1. Try official GraphQL
      const query = `
        query getUserProfile($username: String!) {
          matchedUser(username: $username) {
            submitStatsGlobal {
              acSubmissionNum {
                difficulty
                count
              }
            }
            profile {
              ranking
            }
          }
        }
      `;
      const res = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Referer': 'https://leetcode.com',
        },
        body: JSON.stringify({ query, variables: { username } }),
      });

      if (res.ok) {
        const data = await res.json();
        const user = data?.data?.matchedUser;
        if (user) {
          const acStats = user.submitStatsGlobal?.acSubmissionNum || [];
          return {
            easy: acStats.find((s: any) => s.difficulty === 'Easy')?.count || 0,
            medium: acStats.find((s: any) => s.difficulty === 'Medium')?.count || 0,
            hard: acStats.find((s: any) => s.difficulty === 'Hard')?.count || 0,
            total: acStats.find((s: any) => s.difficulty === 'All')?.count || 0,
            ranking: user.profile?.ranking || 0,
          };
        }
      }
    } catch (e) {
      console.warn('Official LeetCode API failed, trying proxy...', e);
    }

    // 2. Fallback to proxy
    try {
      const res = await fetch(`https://leetcode-stats-api.herokuapp.com/${username}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.status === 'success') {
        return {
          easy: data.easySolved || 0,
          medium: data.mediumSolved || 0,
          hard: data.hardSolved || 0,
          total: data.totalSolved || 0,
          ranking: data.ranking || 0,
        };
      }
    } catch (e) {
      console.error('Proxy LeetCode API failed', e);
    }

    return null;
  }

  /**
   * Sync user LeetCode stats, update points, and return new stats.
   * Enforces a 6-hour cooldown to prevent spam/rate-limits unless force=true.
   */
  static async syncUser(supabase: SupabaseClient<any, "public", any>, userId: string, leetcodeUsername: string, force = false) {
    if (!leetcodeUsername) return { success: false, error: 'No LeetCode username provided' };

    // Check cooldown
    if (!force) {
      const { data: userStats } = await supabase
        .from('user_platform_stats')
        .select('sync_cooldown_until')
        .eq('user_id', userId)
        .eq('platform', 'leetcode')
        .single();
      
      if (userStats?.sync_cooldown_until && new Date(userStats.sync_cooldown_until) > new Date()) {
        return { success: false, error: 'Cooldown active', cooldown: userStats.sync_cooldown_until };
      }
    }

    // Fetch stats
    const stats = await this.fetchStats(leetcodeUsername);
    if (!stats) return { success: false, error: 'Failed to fetch LeetCode stats or user not found' };

    // Calculate Points
    // Rule: Easy (2), Medium (5), Hard (10)
    const points = (stats.easy * 2) + (stats.medium * 5) + (stats.hard * 10);

    // Save to user_platform_stats
    const cooldownDate = new Date();
    cooldownDate.setHours(cooldownDate.getHours() + 6);

    const { error: upsertError } = await supabase
      .from('user_platform_stats')
      .upsert({
        user_id: userId,
        platform: 'leetcode',
        easy_solved: stats.easy,
        medium_solved: stats.medium,
        hard_solved: stats.hard,
        total_solved: stats.total,
        ranking: stats.ranking,
        points_awarded: points,
        last_synced_at: new Date().toISOString(),
        sync_cooldown_until: cooldownDate.toISOString()
      }, { onConflict: 'user_id, platform' });

    if (upsertError) {
      return { success: false, error: 'Failed to update platform stats' };
    }

    // Save duplicate data to users table for quick reads (from Phase 1 plan)
    await supabase.from('users').update({
      leetcode_username: leetcodeUsername,
      lc_easy_solved: stats.easy,
      lc_medium_solved: stats.medium,
      lc_hard_solved: stats.hard,
      lc_total_solved: stats.total,
      lc_points: points,
      lc_last_synced_at: new Date().toISOString()
    }).eq('id', userId);

    // Award points via PointsService
    await PointsService.awardPoints(
      supabase,
      userId,
      'leetcode',
      points,
      'leetcode_total',
      `LeetCode Sync: ${stats.easy} Easy, ${stats.medium} Med, ${stats.hard} Hard`
    );

    return { success: true, data: stats, points };
  }
}
