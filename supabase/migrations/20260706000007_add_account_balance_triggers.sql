-- Create trigger functions to automatically update account balances on transaction inserts, updates, and deletes.

-- ── 1. Income Balance Trigger ──────────────────
CREATE OR REPLACE FUNCTION public.handle_income_balance_change()
RETURNS TRIGGER AS $$
BEGIN
    -- INSERT
    IF TG_OP = 'INSERT' THEN
        IF NEW.account_id IS NOT NULL THEN
            UPDATE public.accounts
            SET balance = balance + NEW.amount
            WHERE id = NEW.account_id;
        END IF;
    
    -- UPDATE
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.account_id IS DISTINCT FROM NEW.account_id THEN
            -- Subtract from old account
            IF OLD.account_id IS NOT NULL THEN
                UPDATE public.accounts
                SET balance = balance - OLD.amount
                WHERE id = OLD.account_id;
            END IF;
            -- Add to new account
            IF NEW.account_id IS NOT NULL THEN
                UPDATE public.accounts
                SET balance = balance + NEW.amount
                WHERE id = NEW.account_id;
            END IF;
        ELSE
            -- Adjust same account by difference
            IF NEW.account_id IS NOT NULL AND OLD.amount IS DISTINCT FROM NEW.amount THEN
                UPDATE public.accounts
                SET balance = balance + (NEW.amount - OLD.amount)
                WHERE id = NEW.account_id;
            END IF;
        END IF;

    -- DELETE
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.account_id IS NOT NULL THEN
            UPDATE public.accounts
            SET balance = balance - OLD.amount
            WHERE id = OLD.account_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 2. Expense Balance Trigger ──────────────────
CREATE OR REPLACE FUNCTION public.handle_expense_balance_change()
RETURNS TRIGGER AS $$
BEGIN
    -- INSERT
    IF TG_OP = 'INSERT' THEN
        IF NEW.deleted_at IS NULL AND NEW.account_id IS NOT NULL THEN
            UPDATE public.accounts
            SET balance = balance - NEW.amount
            WHERE id = NEW.account_id;
        END IF;

    -- UPDATE (handles soft delete too)
    ELSIF TG_OP = 'UPDATE' THEN
        -- Case A: Was active, now soft-deleted (or account removed) -> refund old account
        IF (OLD.deleted_at IS NULL AND OLD.account_id IS NOT NULL) AND (NEW.deleted_at IS NOT NULL OR NEW.account_id IS NULL) THEN
            UPDATE public.accounts
            SET balance = balance + OLD.amount
            WHERE id = OLD.account_id;
        
        -- Case B: Was inactive/no account, now active -> charge new account
        ELSIF (OLD.deleted_at IS NOT NULL OR OLD.account_id IS NULL) AND (NEW.deleted_at IS NULL AND NEW.account_id IS NOT NULL) THEN
            UPDATE public.accounts
            SET balance = balance - NEW.amount
            WHERE id = NEW.account_id;
        
        -- Case C: Remained active with account -> handle changes in amount or account
        ELSIF (OLD.deleted_at IS NULL AND OLD.account_id IS NOT NULL) AND (NEW.deleted_at IS NULL AND NEW.account_id IS NOT NULL) THEN
            IF OLD.account_id IS DISTINCT FROM NEW.account_id THEN
                -- Refund old
                UPDATE public.accounts
                SET balance = balance + OLD.amount
                WHERE id = OLD.account_id;
                -- Charge new
                UPDATE public.accounts
                SET balance = balance - NEW.amount
                WHERE id = NEW.account_id;
            ELSIF OLD.amount IS DISTINCT FROM NEW.amount THEN
                -- Charge/refund difference (new amount is higher = subtract more)
                UPDATE public.accounts
                SET balance = balance - (NEW.amount - OLD.amount)
                WHERE id = NEW.account_id;
            END IF;
        END IF;

    -- DELETE (hard delete fallback)
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.deleted_at IS NULL AND OLD.account_id IS NOT NULL THEN
            UPDATE public.accounts
            SET balance = balance + OLD.amount
            WHERE id = OLD.account_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 3. Investment Balance Trigger ───────────────
CREATE OR REPLACE FUNCTION public.handle_investment_balance_change()
RETURNS TRIGGER AS $$
BEGIN
    -- INSERT
    IF TG_OP = 'INSERT' THEN
        IF NEW.account_id IS NOT NULL THEN
            UPDATE public.accounts
            SET balance = balance - NEW.invested_amount
            WHERE id = NEW.account_id;
        END IF;

    -- UPDATE
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.account_id IS DISTINCT FROM NEW.account_id THEN
            -- Refund old account
            IF OLD.account_id IS NOT NULL THEN
                UPDATE public.accounts
                SET balance = balance + OLD.invested_amount
                WHERE id = OLD.account_id;
            END IF;
            -- Charge new account
            IF NEW.account_id IS NOT NULL THEN
                UPDATE public.accounts
                SET balance = balance - NEW.invested_amount
                WHERE id = NEW.account_id;
            END IF;
        ELSE
            -- Adjust same account by difference (higher investment = subtract more)
            IF NEW.account_id IS NOT NULL AND OLD.invested_amount IS DISTINCT FROM NEW.invested_amount THEN
                UPDATE public.accounts
                SET balance = balance - (NEW.invested_amount - OLD.invested_amount)
                WHERE id = NEW.account_id;
            END IF;
        END IF;

    -- DELETE
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.account_id IS NOT NULL THEN
            UPDATE public.accounts
            SET balance = balance + OLD.invested_amount
            WHERE id = OLD.account_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 4. Create Triggers ──────────────────────────
DROP TRIGGER IF EXISTS trg_income_balance ON public.incomes;
CREATE TRIGGER trg_income_balance
AFTER INSERT OR UPDATE OR DELETE ON public.incomes
FOR EACH ROW EXECUTE FUNCTION public.handle_income_balance_change();

DROP TRIGGER IF EXISTS trg_expense_balance ON public.expenses;
CREATE TRIGGER trg_expense_balance
AFTER INSERT OR UPDATE OR DELETE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.handle_expense_balance_change();

DROP TRIGGER IF EXISTS trg_investment_balance ON public.investments;
CREATE TRIGGER trg_investment_balance
AFTER INSERT OR UPDATE OR DELETE ON public.investments
FOR EACH ROW EXECUTE FUNCTION public.handle_investment_balance_change();

-- ── 5. Recalculate Existing Balances ────────────
UPDATE public.accounts a
SET balance = COALESCE((SELECT SUM(amount) FROM public.incomes WHERE account_id = a.id), 0)
              - COALESCE((SELECT SUM(amount) FROM public.expenses WHERE account_id = a.id AND deleted_at IS NULL), 0)
              - COALESCE((SELECT SUM(invested_amount) FROM public.investments WHERE account_id = a.id), 0);
