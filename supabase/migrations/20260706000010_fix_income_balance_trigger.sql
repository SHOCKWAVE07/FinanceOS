-- ==============================================
-- Migration: Fix Income Balance Trigger to handle soft delete (deleted_at) and recalculate balances
-- ==============================================

-- 1. Redefine handle_income_balance_change to correctly handle soft deletes
CREATE OR REPLACE FUNCTION public.handle_income_balance_change()
RETURNS TRIGGER AS $$
BEGIN
    -- INSERT
    IF TG_OP = 'INSERT' THEN
        IF NEW.deleted_at IS NULL AND NEW.account_id IS NOT NULL THEN
            UPDATE public.accounts
            SET balance = balance + NEW.amount
            WHERE id = NEW.account_id;
        END IF;

    -- UPDATE
    ELSIF TG_OP = 'UPDATE' THEN
        -- Case A: Was active, now soft-deleted (or account removed) -> deduct from old account
        IF (OLD.deleted_at IS NULL AND OLD.account_id IS NOT NULL) AND (NEW.deleted_at IS NOT NULL OR NEW.account_id IS NULL) THEN
            UPDATE public.accounts
            SET balance = balance - OLD.amount
            WHERE id = OLD.account_id;
        
        -- Case B: Was inactive/no account, now active -> add to new account
        ELSIF (OLD.deleted_at IS NOT NULL OR OLD.account_id IS NULL) AND (NEW.deleted_at IS NULL AND NEW.account_id IS NOT NULL) THEN
            UPDATE public.accounts
            SET balance = balance + NEW.amount
            WHERE id = NEW.account_id;
        
        -- Case C: Remained active with account -> handle changes in amount or account
        ELSIF (OLD.deleted_at IS NULL AND OLD.account_id IS NOT NULL) AND (NEW.deleted_at IS NULL AND NEW.account_id IS NOT NULL) THEN
            IF OLD.account_id IS DISTINCT FROM NEW.account_id THEN
                -- Deduct old
                UPDATE public.accounts
                SET balance = balance - OLD.amount
                WHERE id = OLD.account_id;
                -- Add new
                UPDATE public.accounts
                SET balance = balance + NEW.amount
                WHERE id = NEW.account_id;
            ELSIF OLD.amount IS DISTINCT FROM NEW.amount THEN
                -- Add/deduct difference (new amount is higher = add difference)
                UPDATE public.accounts
                SET balance = balance + (NEW.amount - OLD.amount)
                WHERE id = NEW.account_id;
            END IF;
        END IF;

    -- DELETE (hard delete fallback)
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.deleted_at IS NULL AND OLD.account_id IS NOT NULL THEN
            UPDATE public.accounts
            SET balance = balance - OLD.amount
            WHERE id = OLD.account_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Recalculate all account balances to ensure absolute correctness (excluding soft-deleted incomes, expenses, and investments)
UPDATE public.accounts a
SET balance = COALESCE((SELECT SUM(amount) FROM public.incomes WHERE account_id = a.id AND deleted_at IS NULL), 0)
              - COALESCE((SELECT SUM(amount) FROM public.expenses WHERE account_id = a.id AND deleted_at IS NULL), 0)
              - COALESCE((SELECT SUM(invested_amount) FROM public.investments WHERE account_id = a.id AND deleted_at IS NULL), 0);
