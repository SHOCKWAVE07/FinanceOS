-- ==============================================
-- Migration: Fix invalid date concatenation in timeline_events view
-- ==============================================

CREATE OR REPLACE VIEW public.timeline_events WITH (security_invoker = true) AS
    -- Expenses
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
    
    -- Incomes
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
    
    -- Salary Records (month is already a DATE, do not append '-01')
    SELECT 
        id as event_id,
        user_id,
        month::timestamp with time zone as event_date,
        'salary' as event_type,
        (designation || ' at ' || company) as title,
        net_salary as amount,
        'INR' as currency,
        notes as description
    FROM public.salary_records
    
    UNION ALL
    
    -- Investment Purchases
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
    
    -- Notes
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
    
    -- Goals Pending (Milestones Target)
    SELECT 
        id as event_id,
        user_id,
        target_date::timestamp with time zone as event_date,
        'milestone_pending' as event_type,
        ('Goal Target: ' || name) as title,
        target_amount as amount,
        'INR' as currency,
        description
    FROM public.goals
    WHERE status != 'completed'
    
    UNION ALL
    
    -- Goals Completed (Milestones Achieved)
    SELECT 
        id as event_id,
        user_id,
        updated_at as event_date,
        'milestone_achieved' as event_type,
        ('Goal Completed: ' || name) as title,
        target_amount as amount,
        'INR' as currency,
        description
    FROM public.goals
    WHERE status = 'completed';
