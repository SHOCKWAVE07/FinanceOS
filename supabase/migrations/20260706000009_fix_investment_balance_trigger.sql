-- ==============================================
-- Migration: Fix Investment Balance Trigger to handle soft delete (deleted_at) and correct recalculations
-- ==============================================

-- 1. Redefine handle_investment_balance_change to correctly handle soft deletes
CREATE OR REPLACE FUNCTION public.handle_investment_balance_change()
RETURNS TRIGGER AS $$
BEGIN
    -- INSERT
    IF TG_OP = 'INSERT' THEN
        IF NEW.deleted_at IS NULL AND NEW.account_id IS NOT NULL THEN
            UPDATE public.accounts
            SET balance = balance - NEW.invested_amount
            WHERE id = NEW.account_id;
        END IF;

    -- UPDATE
    ELSIF TG_OP = 'UPDATE' THEN
        -- Case A: Was active, now soft-deleted (or account removed) -> refund old account
        IF (OLD.deleted_at IS NULL AND OLD.account_id IS NOT NULL) AND (NEW.deleted_at IS NOT NULL OR NEW.account_id IS NULL) THEN
            UPDATE public.accounts
            SET balance = balance + OLD.invested_amount
            WHERE id = OLD.account_id;
        
        -- Case B: Was inactive/no account, now active -> charge new account
        ELSIF (OLD.deleted_at IS NOT NULL OR OLD.account_id IS NULL) AND (NEW.deleted_at IS NULL AND NEW.account_id IS NOT NULL) THEN
            UPDATE public.accounts
            SET balance = balance - NEW.invested_amount
            WHERE id = NEW.account_id;
        
        -- Case C: Remained active with account -> handle changes in amount or account
        ELSIF (OLD.deleted_at IS NULL AND OLD.account_id IS NOT NULL) AND (NEW.deleted_at IS NULL AND NEW.account_id IS NOT NULL) THEN
            IF OLD.account_id IS DISTINCT FROM NEW.account_id THEN
                -- Refund old
                UPDATE public.accounts
                SET balance = balance + OLD.invested_amount
                WHERE id = OLD.account_id;
                -- Charge new
                UPDATE public.accounts
                SET balance = balance - NEW.invested_amount
                WHERE id = NEW.account_id;
            ELSIF OLD.invested_amount IS DISTINCT FROM NEW.invested_amount THEN
                -- Charge/refund difference (new amount is higher = subtract more)
                UPDATE public.accounts
                SET balance = balance - (NEW.invested_amount - OLD.invested_amount)
                WHERE id = NEW.account_id;
            END IF;
        END IF;

    -- DELETE (hard delete fallback)
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.deleted_at IS NULL AND OLD.account_id IS NOT NULL THEN
            UPDATE public.accounts
            SET balance = balance + OLD.invested_amount
            WHERE id = OLD.account_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Recalculate all account balances to ensure absolute correctness (excluding soft-deleted expenses and investments)
UPDATE public.accounts a
SET balance = COALESCE((SELECT SUM(amount) FROM public.incomes WHERE account_id = a.id AND deleted_at IS NULL), 0)
              - COALESCE((SELECT SUM(amount) FROM public.expenses WHERE account_id = a.id AND deleted_at IS NULL), 0)
              - COALESCE((SELECT SUM(invested_amount) FROM public.investments WHERE account_id = a.id AND deleted_at IS NULL), 0);
