-- Advanced LeetCode Sync Schema
CREATE TABLE IF NOT EXISTS public.leetcode_sync_history (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  username VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'success',
  easy_delta INT DEFAULT 0,
  medium_delta INT DEFAULT 0,
  hard_delta INT DEFAULT 0,
  credits_earned INT DEFAULT 0,
  streak_multiplier NUMERIC(3,2) DEFAULT 1.00,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.leetcode_user_streaks (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  current_streak INT DEFAULT 0,
  highest_streak INT DEFAULT 0,
  last_solved_date DATE
);

CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  source VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.leetcode_sync_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leetcode_user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own sync history" ON public.leetcode_sync_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Streaks are public" ON public.leetcode_user_streaks FOR SELECT USING (TRUE);
CREATE POLICY "Ledger is public" ON public.credit_ledger FOR SELECT USING (TRUE);
