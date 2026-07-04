-- ==============================================
-- Security Fix: Recreate Views with security_invoker = true
-- Migration: 20260706000002_fix_views_security.sql
-- ==============================================

-- 1. Active Expenses
CREATE OR REPLACE VIEW public.active_expenses WITH (security_invoker = true) AS
    SELECT * FROM public.expenses
    WHERE deleted_at IS NULL;

-- 2. Active Incomes
CREATE OR REPLACE VIEW public.active_incomes WITH (security_invoker = true) AS
    SELECT * FROM public.incomes
    WHERE deleted_at IS NULL;

-- 3. Active Investments
CREATE OR REPLACE VIEW public.active_investments WITH (security_invoker = true) AS
    SELECT * FROM public.investments
    WHERE deleted_at IS NULL;

-- 4. Active Notes
CREATE OR REPLACE VIEW public.active_notes WITH (security_invoker = true) AS
    SELECT * FROM public.notes
    WHERE deleted_at IS NULL;

-- 5. Unified Timeline Events View
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
    
    -- Salary Records
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
    
    -- Milestones
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

-- 6. Monthly Cash Flow (Incomes vs Expenses)
CREATE OR REPLACE VIEW public.monthly_cash_flow WITH (security_invoker = true) AS
WITH monthly_income AS (
    SELECT 
        user_id,
        date_trunc('month', date)::date as month,
        COALESCE(sum(amount), 0) as total_income
    FROM public.incomes
    WHERE deleted_at IS NULL
    GROUP BY user_id, date_trunc('month', date)
),
monthly_expense AS (
    SELECT 
        user_id,
        date_trunc('month', date)::date as month,
        COALESCE(sum(amount), 0) as total_expense
    FROM public.expenses
    WHERE deleted_at IS NULL
    GROUP BY user_id, date_trunc('month', date)
)
SELECT 
    COALESCE(i.user_id, e.user_id) as user_id,
    COALESCE(i.month, e.month) as month,
    COALESCE(i.total_income, 0)::numeric(15,2) as total_income,
    COALESCE(e.total_expense, 0)::numeric(15,2) as total_expense,
    (COALESCE(i.total_income, 0) - COALESCE(e.total_expense, 0))::numeric(15,2) as savings,
    (CASE 
        WHEN COALESCE(i.total_income, 0) > 0 
        THEN ((COALESCE(i.total_income, 0) - COALESCE(e.total_expense, 0)) / i.total_income) * 100 
        ELSE 0 
    END)::numeric(5,2) as savings_rate
FROM monthly_income i
FULL OUTER JOIN monthly_expense e 
  ON i.user_id = e.user_id AND i.month = e.month;

-- 7. Category Spending Breakdown
CREATE OR REPLACE VIEW public.category_spending WITH (security_invoker = true) AS
SELECT 
    e.user_id,
    c.name as category_name,
    c.color as category_color,
    date_trunc('month', e.date)::date as month,
    sum(e.amount)::numeric(15,2) as total_amount,
    count(e.id)::integer as transaction_count
FROM public.expenses e
JOIN public.categories c ON e.category_id = c.id
WHERE e.deleted_at IS NULL
GROUP BY e.user_id, c.name, c.color, date_trunc('month', e.date);
