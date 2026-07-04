-- ==============================================
-- Phase 3: Income & Salary Tracking Schema
-- Migration: 20260703000006_create_income_and_salary.sql
-- ==============================================

-- -----------------------------------------------
-- INCOMES
-- -----------------------------------------------
CREATE TABLE public.incomes (
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
    source            TEXT,         -- e.g. Employer Name, Client Name, Dividend, etc.

    -- Flags
    is_recurring      BOOLEAN       NOT NULL DEFAULT FALSE,

    -- Soft delete
    deleted_at        TIMESTAMPTZ,

    created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX idx_incomes_user_id        ON public.incomes(user_id);
CREATE INDEX idx_incomes_date           ON public.incomes(date DESC);
CREATE INDEX idx_incomes_category_id    ON public.incomes(category_id);
CREATE INDEX idx_incomes_account_id     ON public.incomes(account_id);
CREATE INDEX idx_incomes_active         ON public.incomes(user_id, date DESC)
    WHERE deleted_at IS NULL;

ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own incomes"
    ON public.incomes FOR ALL
    USING (auth.uid() = user_id);

CREATE TRIGGER set_incomes_updated_at
    BEFORE UPDATE ON public.incomes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- -----------------------------------------------
-- INCOME ↔ TAG  (many-to-many)
-- -----------------------------------------------
CREATE TABLE public.income_tags (
    income_id  UUID NOT NULL REFERENCES public.incomes(id) ON DELETE CASCADE,
    tag_id      UUID NOT NULL REFERENCES public.tags(id)     ON DELETE CASCADE,
    PRIMARY KEY (income_id, tag_id)
);

ALTER TABLE public.income_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own income tags"
    ON public.income_tags FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.incomes i
            WHERE i.id = income_id
              AND i.user_id = auth.uid()
        )
    );

-- -----------------------------------------------
-- SALARY RECORDS (Monthly Payslips)
-- -----------------------------------------------
CREATE TABLE public.salary_records (
    id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID          NOT NULL REFERENCES public.profiles(id)       ON DELETE CASCADE,
    income_id         UUID          REFERENCES public.incomes(id)                ON DELETE SET NULL,

    month             DATE          NOT NULL, -- Stored as YYYY-MM-01 representing the pay cycle month
    company           TEXT          NOT NULL,
    designation       TEXT          NOT NULL,

    -- Earnings breakdown
    basic             NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (basic >= 0),
    hra               NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (hra >= 0),
    special_allowance NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (special_allowance >= 0),
    lta               NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (lta >= 0),
    
    -- Deductions breakdown
    pf_deduction      NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (pf_deduction >= 0),
    tax_deduction     NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (tax_deduction >= 0),
    other_deductions  NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (other_deductions >= 0),

    -- Derived/Summary fields (usually basic + hra + allowance + lta - deductions)
    net_salary        NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (net_salary >= 0),
    gross_salary      NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (gross_salary >= 0),
    
    notes             TEXT,

    created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    
    UNIQUE (user_id, month)
);

CREATE INDEX idx_salary_records_user_id ON public.salary_records(user_id);
CREATE INDEX idx_salary_records_month   ON public.salary_records(month DESC);

ALTER TABLE public.salary_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own salary records"
    ON public.salary_records FOR ALL
    USING (auth.uid() = user_id);

CREATE TRIGGER set_salary_records_updated_at
    BEFORE UPDATE ON public.salary_records
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- -----------------------------------------------
-- SALARY APPRAISALS (Hike History)
-- -----------------------------------------------
CREATE TABLE public.salary_appraisals (
    id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID          NOT NULL REFERENCES public.profiles(id)       ON DELETE CASCADE,

    company               TEXT          NOT NULL,
    designation           TEXT          NOT NULL,
    effective_date        DATE          NOT NULL,

    previous_gross_salary NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (previous_gross_salary >= 0),
    new_gross_salary      NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (new_gross_salary >= 0),
    
    -- Auto-calculated percentage hike
    percentage_hike       NUMERIC(5,2)  GENERATED ALWAYS AS (
        CASE WHEN previous_gross_salary > 0 
             THEN ((new_gross_salary - previous_gross_salary) / previous_gross_salary) * 100 
             ELSE 0 
        END
    ) STORED,

    notes                 TEXT,

    created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_salary_appraisals_user_id ON public.salary_appraisals(user_id);
CREATE INDEX idx_salary_appraisals_date    ON public.salary_appraisals(effective_date DESC);

ALTER TABLE public.salary_appraisals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own appraisals"
    ON public.salary_appraisals FOR ALL
    USING (auth.uid() = user_id);

CREATE TRIGGER set_salary_appraisals_updated_at
    BEFORE UPDATE ON public.salary_appraisals
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- -----------------------------------------------
-- HELPER VIEW: active incomes with soft-delete filter
-- -----------------------------------------------
CREATE VIEW public.active_incomes AS
    SELECT * FROM public.incomes
    WHERE deleted_at IS NULL;
