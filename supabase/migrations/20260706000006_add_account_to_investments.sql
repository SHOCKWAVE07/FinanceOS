-- ==============================================
-- Migration: Add account_id to investments
-- ==============================================

-- 1. Add account_id column
ALTER TABLE public.investments 
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;

-- 2. Recreate index for account_id
CREATE INDEX IF NOT EXISTS idx_investments_account_id ON public.investments(account_id);

-- 3. Recreate active_investments view to pick up new column
CREATE OR REPLACE VIEW public.active_investments WITH (security_invoker = true) AS
    SELECT * FROM public.investments
    WHERE deleted_at IS NULL;
