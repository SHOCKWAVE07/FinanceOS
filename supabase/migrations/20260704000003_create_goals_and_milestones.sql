-- ==============================================
-- GOALS
-- ==============================================
CREATE TABLE public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    target_amount NUMERIC(15, 2) NOT NULL CHECK (target_amount > 0),
    target_date DATE NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('retirement', 'house', 'car', 'education', 'vacation', 'emergency_fund', 'other')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'abandoned')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    manual_savings NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (manual_savings >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own goals"
    ON public.goals FOR ALL
    USING (auth.uid() = user_id);

-- ==============================================
-- GOAL INVESTMENTS (Junction Table)
-- ==============================================
CREATE TABLE public.goal_investments (
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    investment_id UUID NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
    allocated_share NUMERIC(5, 2) NOT NULL DEFAULT 100.00 CHECK (allocated_share >= 0 AND allocated_share <= 100.00),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (goal_id, investment_id)
);

ALTER TABLE public.goal_investments ENABLE ROW LEVEL SECURITY;

-- Users can only manage linkages to goals they own
CREATE POLICY "Users can manage goal investments link"
    ON public.goal_investments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.goals
            WHERE public.goals.id = public.goal_investments.goal_id
            AND public.goals.user_id = auth.uid()
        )
    );

-- ==============================================
-- MILESTONES
-- ==============================================
CREATE TABLE public.milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_amount NUMERIC(15, 2) CHECK (target_amount >= 0),
    target_date DATE,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

-- Users can only manage milestones for goals they own
CREATE POLICY "Users can manage milestones"
    ON public.milestones FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.goals
            WHERE public.goals.id = public.milestones.goal_id
            AND public.goals.user_id = auth.uid()
        )
    );

-- ==============================================
-- TRIGGERS
-- ==============================================
CREATE TRIGGER set_goals_updated_at
    BEFORE UPDATE ON public.goals
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_milestones_updated_at
    BEFORE UPDATE ON public.milestones
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
