-- -----------------------------------------------
-- 4. FIX COLUMN NAMES (MIGRATION)
-- -----------------------------------------------
DO $$ 
BEGIN 
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name='question_bank' AND column_name='parameters') THEN
    ALTER TABLE public.question_bank RENAME COLUMN parameters TO function_params;
  END IF;
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name='question_bank' AND column_name='return_type') THEN
    ALTER TABLE public.question_bank RENAME COLUMN return_type TO function_return_type;
  END IF;
  IF NOT EXISTS(SELECT * FROM information_schema.columns WHERE table_name='question_bank' AND column_name='function_templates') THEN
    ALTER TABLE public.question_bank ADD COLUMN function_templates JSONB;
  END IF;
END $$;
