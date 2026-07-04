-- ==============================================
-- Phase 2: Expense Tracking Schema
-- Migration: 20260703000005_create_expenses.sql
-- ==============================================

-- -----------------------------------------------
-- RECURRING RULES (must exist before expenses)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.recurring_rules (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    title           TEXT          NOT NULL,
    amount          NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    currency        TEXT          NOT NULL DEFAULT 'INR',
    category_id     UUID          REFERENCES public.categories(id) ON DELETE SET NULL,
    account_id      UUID          REFERENCES public.accounts(id)   ON DELETE SET NULL,
    notes           TEXT,
    merchant        TEXT,

    -- Schedule
    frequency       TEXT          NOT NULL CHECK (frequency IN (
                        'daily', 'weekly', 'biweekly',
                        'monthly', 'quarterly', 'yearly'
                    )),
    interval_count  INTEGER       NOT NULL DEFAULT 1 CHECK (interval_count > 0),
    start_date      DATE          NOT NULL,
    end_date        DATE,
    next_due_date   DATE          NOT NULL,
    last_generated  DATE,

    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE public.recurring_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own recurring rules" ON public.recurring_rules;
CREATE POLICY "Users can manage own recurring rules"
    ON public.recurring_rules FOR ALL
    USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_recurring_rules_updated_at ON public.recurring_rules;
CREATE TRIGGER set_recurring_rules_updated_at
    BEFORE UPDATE ON public.recurring_rules
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- -----------------------------------------------
-- EXPENSES
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
    id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID          NOT NULL REFERENCES public.profiles(id)       ON DELETE CASCADE,
    account_id        UUID          REFERENCES public.accounts(id)                ON DELETE SET NULL,
    category_id       UUID          REFERENCES public.categories(id)              ON DELETE SET NULL,
    recurring_rule_id UUID          REFERENCES public.recurring_rules(id)         ON DELETE SET NULL,

    title             TEXT          NOT NULL,
    amount            NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    currency          TEXT          NOT NULL DEFAULT 'INR',
    date              DATE          NOT NULL,
    notes             TEXT,
    merchant          TEXT,

    -- Flags
    is_recurring      BOOLEAN       NOT NULL DEFAULT FALSE,
    is_reimbursable   BOOLEAN       NOT NULL DEFAULT FALSE,
    is_reimbursed     BOOLEAN       NOT NULL DEFAULT FALSE,

    -- Soft delete
    deleted_at        TIMESTAMPTZ,

    created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_expenses_user_id        ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date           ON public.expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id    ON public.expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_account_id     ON public.expenses(account_id);
CREATE INDEX IF NOT EXISTS idx_expenses_active         ON public.expenses(user_id, date DESC)
    WHERE deleted_at IS NULL;

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own expenses" ON public.expenses;
CREATE POLICY "Users can manage own expenses"
    ON public.expenses FOR ALL
    USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_expenses_updated_at ON public.expenses;
CREATE TRIGGER set_expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- -----------------------------------------------
-- EXPENSE ↔ TAG  (many-to-many)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.expense_tags (
    expense_id  UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
    tag_id      UUID NOT NULL REFERENCES public.tags(id)     ON DELETE CASCADE,
    PRIMARY KEY (expense_id, tag_id)
);

ALTER TABLE public.expense_tags ENABLE ROW LEVEL SECURITY;

-- Policy: user must own the parent expense
DROP POLICY IF EXISTS "Users can manage own expense tags" ON public.expense_tags;
CREATE POLICY "Users can manage own expense tags"
    ON public.expense_tags FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.expenses e
            WHERE e.id = expense_id
              AND e.user_id = auth.uid()
        )
    );

-- -----------------------------------------------
-- ATTACHMENTS  (receipts / PDFs)
-- Reusable across expenses (Phase 2) and notes (Phase 6)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.attachments (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Nullable FKs — one attachment belongs to one entity at a time
    expense_id   UUID        REFERENCES public.expenses(id) ON DELETE CASCADE,
    note_id      UUID,       -- FK added in Phase 6 migration

    name         TEXT        NOT NULL,
    size         BIGINT      NOT NULL CHECK (size > 0),
    mime_type    TEXT        NOT NULL,
    storage_path TEXT        NOT NULL,  -- path inside Supabase Storage bucket

    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attachments_expense_id ON public.attachments(expense_id);

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own attachments" ON public.attachments;
CREATE POLICY "Users can manage own attachments"
    ON public.attachments FOR ALL
    USING (auth.uid() = user_id);

-- -----------------------------------------------
-- HELPER VIEW: expenses with soft-delete filter
-- (convenience for application queries)
-- -----------------------------------------------
CREATE OR REPLACE VIEW public.active_expenses WITH (security_invoker = true) AS
    SELECT * FROM public.expenses
    WHERE deleted_at IS NULL;

-- -----------------------------------------------
-- FUNCTION: advance recurring rule after generation
-- Called by processRecurringExpenses server action
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.advance_recurring_rule(rule_id UUID)
RETURNS void AS $$
DECLARE
    r public.recurring_rules%ROWTYPE;
    next_date DATE;
BEGIN
    SELECT * INTO r FROM public.recurring_rules WHERE id = rule_id;

    -- Calculate next due date based on frequency
    next_date := CASE r.frequency
        WHEN 'daily'     THEN r.next_due_date + (r.interval_count * INTERVAL '1 day')
        WHEN 'weekly'    THEN r.next_due_date + (r.interval_count * INTERVAL '1 week')
        WHEN 'biweekly'  THEN r.next_due_date + (r.interval_count * INTERVAL '2 weeks')
        WHEN 'monthly'   THEN r.next_due_date + (r.interval_count * INTERVAL '1 month')
        WHEN 'quarterly' THEN r.next_due_date + (r.interval_count * INTERVAL '3 months')
        WHEN 'yearly'    THEN r.next_due_date + (r.interval_count * INTERVAL '1 year')
    END;

    -- Deactivate if past end_date
    UPDATE public.recurring_rules
    SET
        last_generated = r.next_due_date,
        next_due_date  = next_date,
        is_active      = CASE
                            WHEN r.end_date IS NOT NULL AND next_date > r.end_date
                            THEN FALSE
                            ELSE TRUE
                         END,
        updated_at     = now()
    WHERE id = rule_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
