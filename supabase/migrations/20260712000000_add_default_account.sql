-- ==============================================
-- Migration: Add is_default to accounts
-- Migration: 20260712000000_add_default_account.sql
-- ==============================================

-- 1. Add is_default column to accounts if it doesn't exist
ALTER TABLE public.accounts 
ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Create unique index to ensure only one default account per user
DROP INDEX IF EXISTS idx_accounts_user_default;
CREATE UNIQUE INDEX idx_accounts_user_default ON public.accounts(user_id) WHERE (is_default = true AND is_active = true);

-- 3. Set the first active account for each user as default
WITH user_first_account AS (
    SELECT DISTINCT ON (user_id) id
    FROM public.accounts
    WHERE is_active = true
    ORDER BY user_id, sort_order ASC, created_at ASC
)
UPDATE public.accounts
SET is_default = TRUE
WHERE id IN (SELECT id FROM user_first_account);
