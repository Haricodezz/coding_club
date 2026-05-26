// ============================================================
// TypeScript Types — Coding Club MVP
// ============================================================

export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  roll_number?: string;
  academic_year?: number;
  branch?: string;
  phone?: string;
  bio?: string;
  portfolio_url?: string;
  linkedin_url?: string;
  github_username?: string;
  leetcode_username?: string;
  codeforces_username?: string;
  hackerrank_username?: string;
  skills?: string[];
  batch_id?: string;
  role: 'super_admin' | 'team' | 'student';
  avatar_url: string;
  platform_profiles?: PlatformProfiles; // Deprecated in favor of direct fields
  platform_stats?: PlatformStats; // Deprecated in favor of UserPlatformStats table
  platform_points: number;
  lc_easy_solved: number;
  lc_medium_solved: number;
  lc_hard_solved: number;
  lc_total_solved: number;
  lc_points: number;
  lc_last_synced_at?: string;
  total_points: number;
  created_at: string;
  updated_at: string;
}

export interface PlatformProfiles {
  codeforces_handle?: string;
  leetcode_handle?: string;
  hackerrank_handle?: string;
}

export interface PlatformStats {
  codeforces?: { solved: number; rating: number; max_rating: number };
  leetcode?: { solved: number; ranking: number };
  hackerrank?: { solved: number };
}

// -----------------------------------------------
// Learning
// -----------------------------------------------
export interface LearningResource {
  id: number;
  title: string;
  category: ResourceCategory;
  youtube_url?: string;
  platform?: string;
  difficulty: Difficulty;
  description?: string;
  added_by?: string;
  is_active: boolean;
  created_at: string;
  // Joined field
  is_completed?: boolean;
}

export type ResourceCategory =
  | 'DSA'
  | 'Web Dev'
  | 'Competitive Programming'
  | 'System Design';

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface UserProgress {
  user_id: string;
  resource_id: number;
  completed: boolean;
  completion_date?: string;
  time_spent_minutes?: number;
  notes?: string;
}

// -----------------------------------------------
// Questions & QotD
// -----------------------------------------------
export interface Question {
  id: number;
  title: string;
  description: string;
  example_input?: string;
  example_output?: string;
  constraints?: string;
  test_cases: TestCase[];
  difficulty: QuestionDifficulty;
  tags?: string[];
  author_id?: string;
  is_published: boolean;
  is_public: boolean;
  created_at: string;
}

export interface TestCase {
  input: string;
  expected_output: string;
  explanation?: string;
}

export type QuestionDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface QotDCalendar {
  date: string;
  question_id: number;
  is_active: boolean;
}

export interface QotDSubmission {
  id: number;
  user_id: string;
  question_id: number;
  code: string;
  language: string;
  passed_tests: number;
  total_tests: number;
  points_earned: number;
  stdout?: string;
  stderr?: string;
  submitted_at: string;
}

// -----------------------------------------------
// Contests
// -----------------------------------------------
export interface Contest {
  id: number;
  title: string;
  hackerrank_contest_id?: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: ContestStatus;
  last_synced_at?: string;
  created_at: string;
}

export type ContestStatus = 'upcoming' | 'active' | 'completed';

export interface ContestResult {
  user_id: string;
  contest_id: number;
  hackerrank_score: number;
  rank?: number;
  solved_questions: number;
  synced_at: string;
  // Joined
  username?: string;
  avatar_url?: string;
}

// -----------------------------------------------
// Leaderboard
// -----------------------------------------------
export interface LeaderboardEntry {
  id: string;
  username: string;
  avatar_url: string;
  batch_id?: string;
  platform_points: number;
  qotd_points: number;
  contest_points: number;
  total_points: number;
  last_updated: string;
  // Computed
  rank?: number;
}

// -----------------------------------------------
// Custom Questions
// -----------------------------------------------
export interface CustomQuestion {
  id: number;
  title: string;
  description: string;
  constraints?: string;
  test_cases: TestCase[];
  difficulty: QuestionDifficulty;
  creator_id?: string;
  is_published: boolean;
  is_public: boolean;
  created_at: string;
}

// -----------------------------------------------
// IDE / Compiler
// -----------------------------------------------
export interface Language {
  id: string; // Piston runtime name, e.g. "python"
  version: string;
  displayName: string;
  monacoLanguage: string; // Monaco editor language id
  judgeId?: number; // Judge0 language_id (fallback)
}

export interface ExecutionRequest {
  code: string;
  language: string; // Piston runtime
  version?: string;
  stdin?: string;
}

export interface ExecutionResult {
  success: boolean;
  output?: string;
  stderr?: string;
  compile_output?: string;
  time?: number;
  memory?: number;
  exit_code?: number;
  error?: string;
  message?: string;
}

export interface TestCaseResult {
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
  stderr?: string;
  runtime?: number;
}

// -----------------------------------------------
// API Responses
// -----------------------------------------------
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

// -----------------------------------------------
// Enhanced Feature Types
// -----------------------------------------------

export interface PointsHistory {
  id: string;
  user_id: string;
  source: 'leetcode' | 'codeforces' | 'hackerrank' | 'qotd' | 'contest' | 'learning' | 'streak' | 'achievement' | string;
  source_id?: string;
  points: number;
  description?: string;
  created_at: string;
}

export interface UserPlatformStatRow {
  user_id: string;
  platform: 'leetcode' | 'codeforces' | 'hackerrank' | string;
  easy_solved: number;
  medium_solved: number;
  hard_solved: number;
  total_solved: number;
  rating: number;
  ranking: number;
  raw_score: number;
  points_awarded: number;
  last_synced_at: string;
  sync_cooldown_until?: string;
}

export interface LeaderboardSnapshot {
  id: string;
  snapshot_date: string;
  user_id: string;
  rank: number;
  total_points: number;
  qotd_points: number;
  lc_points: number;
  contest_points: number;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_key: string;
  metadata: Record<string, any>;
  awarded_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface CsvImportLog {
  id: string;
  imported_by?: string;
  filename: string;
  total_rows: number;
  success_rows: number;
  failed_rows: number;
  status: 'pending' | 'processing' | 'done' | 'rolled_back';
  errors: any[];
  created_at: string;
  updated_at: string;
}

export interface Streak {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_active_date?: string;
  streak_points: number;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------
// Unified Resources Ecosystem
// -----------------------------------------------

export interface ResourceCourse {
  id: string;
  slug: string;
  title: string;
  description?: string;
  banner_url?: string;
  difficulty_level?: 'Beginner' | 'Intermediate' | 'Advanced' | string;
  is_published: boolean;
  display_order: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  modules?: ResourceModule[];
}

export interface ResourceModule {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  display_order: number;
  created_at: string;
  // Joined fields
  items?: ResourceItem[];
}

export interface ResourceItem {
  id: string;
  module_id: string;
  title: string;
  slug: string;
  description?: string;
  topic_name?: string;
  resource_type: 'youtube' | 'article' | 'github' | 'practice' | 'doc' | 'pdf' | string;
  url: string;
  estimated_duration?: number;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced' | string;
  display_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  // Joined progress
  progress?: ResourceProgress[];
  bookmarks?: ResourceBookmark[];
}

export interface ResourceProgress {
  user_id: string;
  item_id: string;
  completed: boolean;
  completed_at?: string;
}

export interface ResourceBookmark {
  user_id: string;
  item_id: string;
  created_at: string;
}

export interface ResourceTag {
  id: string;
  name: string;
}

export interface ResourceItemTag {
  item_id: string;
  tag_id: string;
}
