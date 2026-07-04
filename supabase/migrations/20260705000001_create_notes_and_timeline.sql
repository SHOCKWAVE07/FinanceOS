-- ==============================================
-- Phase 6: Notes & Timeline Schema
-- Migration: 20260705000001_create_notes_and_timeline.sql
-- ==============================================

-- -----------------------------------------------
-- NOTES
-- -----------------------------------------------
CREATE TABLE public.notes (
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title       TEXT          NOT NULL,
    content     TEXT          NOT NULL DEFAULT '', -- Markdown content
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_notes_user_id ON public.notes(user_id);
CREATE INDEX idx_notes_created_at ON public.notes(created_at DESC);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notes"
    ON public.notes FOR ALL
    USING (auth.uid() = user_id);

CREATE TRIGGER set_notes_updated_at
    BEFORE UPDATE ON public.notes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- -----------------------------------------------
-- NOTE ↔ TAG (many-to-many junction)
-- -----------------------------------------------
CREATE TABLE public.note_tags (
    note_id  UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    tag_id   UUID NOT NULL REFERENCES public.tags(id)     ON DELETE CASCADE,
    PRIMARY KEY (note_id, tag_id)
);

ALTER TABLE public.note_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own note tags"
    ON public.note_tags FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.notes n
            WHERE n.id = note_id
              AND n.user_id = auth.uid()
        )
    );

-- -----------------------------------------------
-- NOTE ↔ ENTITIES LINKS (Polymorphic junction)
-- -----------------------------------------------
CREATE TABLE public.note_links (
    note_id      UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    link_type    TEXT NOT NULL CHECK (link_type IN ('expense', 'income', 'investment', 'goal')),
    link_id      UUID NOT NULL,
    PRIMARY KEY (note_id, link_type, link_id)
);

ALTER TABLE public.note_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own note links"
    ON public.note_links FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.notes n
            WHERE n.id = note_id
              AND n.user_id = auth.uid()
        )
    );

-- -----------------------------------------------
-- ALTER ATTACHMENTS TO REFERENCE NOTES (SAFE IDEMPOTENT BLOCK)
-- -----------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'attachments' 
          AND column_name = 'note_id'
    ) THEN
        ALTER TABLE public.attachments 
            ADD COLUMN note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_attachments_note_id ON public.attachments(note_id);

-- -----------------------------------------------
-- HELPER VIEW: active notes
-- -----------------------------------------------
CREATE VIEW public.active_notes AS
    SELECT * FROM public.notes
    WHERE deleted_at IS NULL;

-- -----------------------------------------------
-- UNIFIED TIMELINE EVENTS VIEW
-- -----------------------------------------------
CREATE OR REPLACE VIEW public.timeline_events AS
    -- 1. Expenses
    SELECT 
        id as event_id,
        user_id,
        date::timestamp with time zone as event_date,
        'expense' as event_type,
        title as title,
        amount,
        currency,
        notes as description
    FROM public.expenses 
    WHERE deleted_at IS NULL
    
    UNION ALL
    
    -- 2. Incomes
    SELECT 
        id as event_id,
        user_id,
        date::timestamp with time zone as event_date,
        'income' as event_type,
        title as title,
        amount,
        currency,
        notes as description
    FROM public.incomes 
    WHERE deleted_at IS NULL
    
    UNION ALL
    
    -- 3. Salary Records
    SELECT 
        id as event_id,
        user_id,
        (month || '-01')::timestamp with time zone as event_date,
        'salary' as event_type,
        (designation || ' at ' || company) as title,
        net_salary as amount,
        'INR' as currency,
        notes as description
    FROM public.salary_records
    
    UNION ALL
    
    -- 4. Investment Purchases
    SELECT 
        id as event_id,
        user_id,
        start_date::timestamp with time zone as event_date,
        'investment_purchase' as event_type,
        ('Purchased ' || name || ' (' || type || ')') as title,
        invested_amount as amount,
        currency,
        notes as description
    FROM public.investments 
    WHERE deleted_at IS NULL
    
    UNION ALL
    
    -- 5. Notes
    SELECT 
        id as event_id,
        user_id,
        created_at as event_date,
        'note' as event_type,
        title as title,
        NULL::numeric as amount,
        'INR' as currency,
        content as description
    FROM public.notes 
    WHERE deleted_at IS NULL
    
    UNION ALL
    
    -- 6. Milestones (Target/Achieved dates)
    SELECT 
        m.id as event_id,
        g.user_id,
        COALESCE(m.completed_at, m.target_date::timestamp with time zone) as event_date,
        CASE WHEN m.is_completed THEN 'milestone_achieved' ELSE 'milestone_pending' END as event_type,
        (g.name || ': ' || m.name) as title,
        m.target_amount as amount,
        'INR' as currency,
        null as description
    FROM public.milestones m
    JOIN public.goals g ON m.goal_id = g.id;
