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

    // 1. Fetch PREVIOUS stats and streaks
    const [{ data: prevStats }, { data: userStreak }] = await Promise.all([
      supabase.from('user_platform_stats').select('*').eq('user_id', userId).eq('platform', 'leetcode').single(),
      supabase.from('leetcode_user_streaks').select('*').eq('user_id', userId).single()
    ]);

    // Check cooldown
    if (!force && prevStats?.sync_cooldown_until && new Date(prevStats.sync_cooldown_until) > new Date()) {
      return { success: false, error: 'Cooldown active', cooldown: prevStats.sync_cooldown_until };
    }

    // 2. Fetch NEW stats
    const stats = await this.fetchStats(leetcodeUsername);
    if (!stats) return { success: false, error: 'Failed to fetch LeetCode stats or user not found' };

    // 3. Calculate Deltas
    const prevEasy = prevStats?.easy_solved || 0;
    const prevMedium = prevStats?.medium_solved || 0;
    const prevHard = prevStats?.hard_solved || 0;
    
    const easyDelta = stats.easy - prevEasy;
    const mediumDelta = stats.medium - prevMedium;
    const hardDelta = stats.hard - prevHard;

    // Validation: LeetCode counts never decrease
    if (easyDelta < 0 || mediumDelta < 0 || hardDelta < 0) {
      // Log failed sync
      await supabase.from('leetcode_sync_history').insert({
        user_id: userId, username: leetcodeUsername, status: 'error',
        error_message: 'Invalid stats: count decreased. Possible API glitch.'
      });
      return { success: false, error: 'Invalid stats returned from LeetCode API' };
    }

    // 4. Streak Calculation
    const totalDelta = easyDelta + mediumDelta + hardDelta;
    let currentStreak = userStreak?.current_streak || 0;
    let highestStreak = userStreak?.highest_streak || 0;
    let lastSolvedDate = userStreak?.last_solved_date ? new Date(userStreak.last_solved_date) : null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (totalDelta > 0) {
      if (!lastSolvedDate || lastSolvedDate < yesterday) {
        // Missed a day or first time
        currentStreak = 1;
      } else if (lastSolvedDate.getTime() === yesterday.getTime()) {
        // Solved yesterday, increment
        currentStreak += 1;
      }
      // If solved today already, streak remains the same
      lastSolvedDate = today;
      highestStreak = Math.max(highestStreak, currentStreak);
    } else if (lastSolvedDate && lastSolvedDate < yesterday) {
      // Missed yesterday and didn't solve today, reset streak
      currentStreak = 0;
    }

    // 5. Multipliers & Credits
    let streakMultiplier = 1.0;
    if (currentStreak >= 7) streakMultiplier = 1.5;
    else if (currentStreak >= 3) streakMultiplier = 1.2;

    const currentHour = new Date().getHours();
    const timeMultiplier = (currentHour >= 0 && currentHour < 6) ? 1.2 : 1.0; // Off-peak bonus

    const baseCredits = (easyDelta * 5) + (mediumDelta * 15) + (hardDelta * 30);
    const earnedCredits = Math.round(baseCredits * streakMultiplier * timeMultiplier);

    // 6. DB Updates
    const cooldownDate = new Date();
    cooldownDate.setHours(cooldownDate.getHours() + 6);

    // Upsert Streaks
    await supabase.from('leetcode_user_streaks').upsert({
      user_id: userId,
      current_streak: currentStreak,
      highest_streak: highestStreak,
      last_solved_date: lastSolvedDate?.toISOString().split('T')[0]
    });

    if (totalDelta > 0 || force) {
      // Upsert Platform Stats
      const totalPoints = (prevStats?.points_awarded || 0) + earnedCredits;
      await supabase.from('user_platform_stats').upsert({
        user_id: userId, platform: 'leetcode',
        easy_solved: stats.easy, medium_solved: stats.medium, hard_solved: stats.hard, total_solved: stats.total,
        ranking: stats.ranking, points_awarded: totalPoints,
        last_synced_at: new Date().toISOString(), sync_cooldown_until: cooldownDate.toISOString()
      }, { onConflict: 'user_id, platform' });

      // Update Users Table for quick reads
      await supabase.from('users').update({
        leetcode_username: leetcodeUsername, lc_easy_solved: stats.easy, lc_medium_solved: stats.medium,
        lc_hard_solved: stats.hard, lc_total_solved: stats.total, lc_points: totalPoints, lc_last_synced_at: new Date().toISOString()
      }).eq('id', userId);
    } else {
      // Just update cooldown
      await supabase.from('user_platform_stats').update({
        sync_cooldown_until: cooldownDate.toISOString(),
        last_synced_at: new Date().toISOString()
      }).eq('user_id', userId).eq('platform', 'leetcode');
    }

    // Insert Sync History
    await supabase.from('leetcode_sync_history').insert({
      user_id: userId, username: leetcodeUsername, status: 'success',
      easy_delta: easyDelta, medium_delta: mediumDelta, hard_delta: hardDelta,
      credits_earned: earnedCredits, streak_multiplier: streakMultiplier
    });

    // Insert Credit Ledger if earned
    if (earnedCredits > 0) {
      await supabase.from('credit_ledger').insert({
        user_id: userId, amount: earnedCredits, source: 'leetcode_sync',
        description: `Sync: ${easyDelta}E, ${mediumDelta}M, ${hardDelta}H (Streak: ${currentStreak}x)`
      });
      
      // Update global points logic
      await PointsService.awardPoints(
        supabase, userId, 'leetcode', earnedCredits, 'leetcode_sync',
        `LeetCode Sync (+${earnedCredits} credits)`
      );
    }

    return { 
      success: true, 
      data: stats, 
      points: earnedCredits,
      breakdown: { easyDelta, mediumDelta, hardDelta, streakMultiplier, timeMultiplier, baseCredits }
    };
  }
}
