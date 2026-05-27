-- ==============================================================================
-- SCHEMA V8: Function-Based Execution Mode
-- Adds support for LeetCode-style execution to contest problems
-- ==============================================================================

-- Add execution mode and function signature details
ALTER TABLE public.contest_problems
  ADD COLUMN IF NOT EXISTS execution_mode VARCHAR(30) DEFAULT 'function' CHECK (execution_mode IN ('function', 'full')),
  ADD COLUMN IF NOT EXISTS function_params JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS function_return_type VARCHAR(50) DEFAULT 'void',
  ADD COLUMN IF NOT EXISTS function_templates JSONB DEFAULT '{}';

-- function_params format: [{ "name": "nums", "type": "vector<int>" }, { "name": "target", "type": "int" }]
-- function_templates format: 
-- {
--   "cpp": { "starter": "class Solution { ... }", "driver": "#include <iostream>\n..." },
--   "python": { "starter": "class Solution:\n...", "driver": "import sys\n..." }
-- }

-- Trigger schema cache refresh if needed
NOTIFY pgrst, 'reload schema';
