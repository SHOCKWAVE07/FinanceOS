-- ==============================================
-- Migration: Add initial_balance to accounts and update recalculation logic
-- Migration: 20260706000012_add_initial_balance_to_accounts.sql
-- ==============================================

-- 1. Add initial_balance column to accounts if it doesn't exist
ALTER TABLE public.accounts 
ADD COLUMN IF NOT EXISTS initial_balance NUMERIC(15, 2) NOT NULL DEFAULT 0;

-- 2. Initialize initial_balance for existing accounts
-- For accounts that have never had transactions, balance is their starting balance.
-- Copy it to initial_balance so it doesn't get wiped out.
UPDATE public.accounts a
SET initial_balance = balance
WHERE NOT EXISTS (
    SELECT 1 FROM public.incomes WHERE account_id = a.id
) AND NOT EXISTS (
    SELECT 1 FROM public.expenses WHERE account_id = a.id
) AND NOT EXISTS (
    SELECT 1 FROM public.investments WHERE account_id = a.id
);

-- 3. Perform a full recalculation of current balances including initial_balance
UPDATE public.accounts a
SET balance = initial_balance
              + COALESCE((SELECT SUM(amount) FROM public.incomes WHERE account_id = a.id AND deleted_at IS NULL), 0)
              - COALESCE((SELECT SUM(amount) FROM public.expenses WHERE account_id = a.id AND deleted_at IS NULL), 0)
              - COALESCE((SELECT SUM(invested_amount) FROM public.investments WHERE account_id = a.id AND deleted_at IS NULL), 0);
