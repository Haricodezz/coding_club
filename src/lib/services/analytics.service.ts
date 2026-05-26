import { SupabaseClient } from '@supabase/supabase-js';
import { PointsService } from './points.service';

export class AnalyticsService {
  /**
   * Log an activity to the activity_logs table
   */
  static async logActivity(
    supabase: SupabaseClient<any, "public", any>,
    userId: string,
    action: string,
    metadata: Record<string, any> = {}
  ) {
    if (!userId) return;
    
    // Log in background
    supabase.from('activity_logs').insert({
      user_id: userId,
      action,
      metadata
    }).then(({ error }) => {
      if (error) console.error('Activity log error:', error);
    });

    // Handle streaks if the action is something that qualifies as daily activity
    const dailyActions = ['solve_qotd', 'run_code', 'sync_leetcode', 'complete_learning'];
    if (dailyActions.includes(action)) {
      await this.updateStreak(supabase, userId);
    }
  }

  /**
   * Update the user's daily streak
   */
  static async updateStreak(supabase: SupabaseClient<any, "public", any>, userId: string) {
    const today = new Date().toISOString().split('T')[0];

    // Get current streak
    const { data: streakRow } = await supabase
      .from('streaks')
      .select('*')
      .eq('user_id', userId)
      .single();

    let newCurrent = 1;
    let newLongest = 1;
    let newPoints = 0;

    if (streakRow) {
      if (streakRow.last_active_date === today) {
        return; // Already updated today
      }

      const lastActive = new Date(streakRow.last_active_date);
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = yesterdayDate.toISOString().split('T')[0];

      if (streakRow.last_active_date === yesterday) {
        // Continue streak
        newCurrent = (streakRow.current_streak || 0) + 1;
      } else {
        // Break streak, start over at 1
        newCurrent = 1;
      }

      newLongest = Math.max(newCurrent, streakRow.longest_streak || 0);
      newPoints = streakRow.streak_points || 0;
    }

    // Award bonus points for hitting streak milestones (e.g., 7 days = 50 pts)
    if (newCurrent > 0 && newCurrent % 7 === 0) {
      newPoints += 50;
      await PointsService.awardPoints(
        supabase,
        userId,
        'streak',
        50,
        `streak_${newCurrent}_${today}`,
        `${newCurrent} Day Streak Bonus!`
      );
    }

    await supabase
      .from('streaks')
      .upsert({
        user_id: userId,
        current_streak: newCurrent,
        longest_streak: newLongest,
        last_active_date: today,
        streak_points: newPoints,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
  }
}
