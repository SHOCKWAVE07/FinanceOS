-- ==============================================
-- Phase 7: Analytics Views Migration
-- Migration: 20260706000001_analytics_views.sql
-- ==============================================

-- -----------------------------------------------
-- VIEW: Monthly Cash Flow (Incomes vs Expenses)
-- -----------------------------------------------
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

-- -----------------------------------------------
-- VIEW: Category Spending Breakdown
-- -----------------------------------------------
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
