-- ==============================================
-- Phase 4: Investment Portfolio & Asset Tracking Schema
-- Migration: 20260704000002_create_investments.sql
-- ==============================================

-- -----------------------------------------------
-- INVESTMENTS (Current holdings/assets)
-- -----------------------------------------------
CREATE TABLE public.investments (
    id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID          NOT NULL REFERENCES public.profiles(id)       ON DELETE CASCADE,
    
    name              TEXT          NOT NULL,
    type              TEXT          NOT NULL CHECK (type IN (
        'mutual_fund', 'stock', 'crypto', 'gold', 
        'fixed_deposit', 'ppf', 'nps', 'real_estate', 'other'
    )),
    institution       TEXT          NOT NULL, -- Broker, bank, etc. (e.g. Zerodha, Groww, SBI)
    
    invested_amount   NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (invested_amount >= 0),
    current_value     NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (current_value >= 0),
    
    quantity          NUMERIC(18,6) DEFAULT NULL, -- Optional for fractional assets like crypto/MF units
    avg_buy_price     NUMERIC(15,4) DEFAULT NULL, -- Optional average buy price
    
    currency          TEXT          NOT NULL DEFAULT 'INR',
    start_date        DATE          NOT NULL DEFAULT CURRENT_DATE,
    
    notes             TEXT,
    
    -- Soft delete
    deleted_at        TIMESTAMPTZ,
    
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_investments_user_id ON public.investments(user_id);
CREATE INDEX idx_investments_type    ON public.investments(type);
CREATE INDEX idx_investments_active  ON public.investments(user_id) WHERE deleted_at IS NULL;

ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own investments"
    ON public.investments FOR ALL
    USING (auth.uid() = user_id);

CREATE TRIGGER set_investments_updated_at
    BEFORE UPDATE ON public.investments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- -----------------------------------------------
-- INVESTMENT VALUATIONS (Valuation History)
-- -----------------------------------------------
CREATE TABLE public.investment_valuations (
    id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    investment_id     UUID          NOT NULL REFERENCES public.investments(id)    ON DELETE CASCADE,
    
    valuation_date    DATE          NOT NULL DEFAULT CURRENT_DATE,
    value             NUMERIC(15,2) NOT NULL CHECK (value >= 0),
    invested_amount   NUMERIC(15,2) NOT NULL CHECK (invested_amount >= 0),
    
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    
    UNIQUE (investment_id, valuation_date)
);

CREATE INDEX idx_valuations_date ON public.investment_valuations(valuation_date DESC);

ALTER TABLE public.investment_valuations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own investment valuations"
    ON public.investment_valuations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.investments i
            WHERE i.id = investment_id
              AND i.user_id = auth.uid()
        )
    );

-- Helper view for active investments
CREATE OR REPLACE VIEW public.active_investments AS
    SELECT * FROM public.investments
    WHERE deleted_at IS NULL;
