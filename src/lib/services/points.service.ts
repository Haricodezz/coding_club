import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';

export class PointsService {
  /**
   * Award points to a user and log it in points_history.
   * If the exact same (user_id, source, source_id) exists, it will be ignored (deduplication).
   */
  static async awardPoints(
    supabase: SupabaseClient<any, "public", any>,
    userId: string,
    source: 'leetcode' | 'codeforces' | 'hackerrank' | 'qotd' | 'contest' | 'learning' | 'streak' | 'achievement' | string,
    points: number,
    sourceId: string = 'default',
    description: string = ''
  ) {
    if (points === 0) return { success: true, message: 'No points awarded' };

    // The table has a UNIQUE(user_id, source, source_id) constraint.
    // We use upsert to either insert or do nothing (if we want to ignore) or update (if we want to overwrite).
    // Usually, we want to update the points if the source_id is the same (e.g. updating LeetCode total points).
    
    const { error } = await supabase
      .from('points_history')
      .upsert({
        user_id: userId,
        source,
        source_id: sourceId,
        points,
        description
      }, {
        onConflict: 'user_id, source, source_id'
      });

    if (error) {
      console.error('Error awarding points:', error);
      return { success: false, error: error.message };
    }

    // Note: The total_points in the users table is automatically recalculated 
    // by the PostgreSQL trigger `trg_recalculate_total_points` that we added.
    
    return { success: true };
  }

  /**
   * Get points history for a user
   */
  static async getHistory(supabase: SupabaseClient<any, "public", any>, userId: string, limit = 50) {
    const { data, error } = await supabase
      .from('points_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }
}
