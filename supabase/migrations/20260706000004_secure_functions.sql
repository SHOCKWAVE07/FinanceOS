-- ==============================================
-- Security Fix: Secure Functions (Search Path & Permissions)
-- Migration: 20260706000004_secure_functions.sql
-- ==============================================

-- 1. update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 2. handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, currency, locale, timezone, theme)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        'INR',
        'en-IN',
        'Asia/Kolkata',
        'system'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- 3. seed_default_categories
CREATE OR REPLACE FUNCTION public.seed_default_categories()
RETURNS TRIGGER AS $$
BEGIN
    -- Seed default expense categories
    INSERT INTO public.categories (user_id, name, slug, type, icon, color, is_system, sort_order) VALUES
    (NEW.id, 'Food & Dining', 'food-dining', 'expense', '🍽️', '#ef4444', TRUE, 1),
    (NEW.id, 'Transportation', 'transportation', 'expense', '🚗', '#f97316', TRUE, 2),
    (NEW.id, 'Shopping', 'shopping', 'expense', '🛍️', '#eab308', TRUE, 3),
    (NEW.id, 'Entertainment', 'entertainment', 'expense', '🎬', '#22c55e', TRUE, 4),
    (NEW.id, 'Bills & Utilities', 'bills-utilities', 'expense', '💡', '#3b82f6', TRUE, 5),
    (NEW.id, 'Healthcare', 'healthcare', 'expense', '🏥', '#8b5cf6', TRUE, 6),
    (NEW.id, 'Education', 'education', 'expense', '📚', '#ec4899', TRUE, 7),
    (NEW.id, 'Travel', 'travel', 'expense', '✈️', '#06b6d4', TRUE, 8),
    (NEW.id, 'Groceries', 'groceries', 'expense', '🛒', '#10b981', TRUE, 9),
    (NEW.id, 'Rent', 'rent', 'expense', '🏠', '#6366f1', TRUE, 10),
    (NEW.id, 'Insurance', 'insurance', 'expense', '🛡️', '#14b8a6', TRUE, 11),
    (NEW.id, 'Personal Care', 'personal-care', 'expense', '💇', '#f43f5e', TRUE, 12),
    (NEW.id, 'Gifts & Donations', 'gifts-donations', 'expense', '🎁', '#a855f7', TRUE, 13),
    (NEW.id, 'Subscriptions', 'subscriptions', 'expense', '📱', '#0ea5e9', TRUE, 14),
    (NEW.id, 'Other Expense', 'other-expense', 'expense', '📌', '#64748b', TRUE, 15);

    -- Seed default income categories
    INSERT INTO public.categories (user_id, name, slug, type, icon, color, is_system, sort_order) VALUES
    (NEW.id, 'Salary', 'salary', 'income', '💰', '#22c55e', TRUE, 1),
    (NEW.id, 'Freelance', 'freelance', 'income', '💻', '#3b82f6', TRUE, 2),
    (NEW.id, 'Investment Returns', 'investment-returns', 'income', '📈', '#10b981', TRUE, 3),
    (NEW.id, 'Rental Income', 'rental-income', 'income', '🏠', '#6366f1', TRUE, 4),
    (NEW.id, 'Interest', 'interest', 'income', '🏦', '#14b8a6', TRUE, 5),
    (NEW.id, 'Dividends', 'dividends', 'income', '💵', '#0ea5e9', TRUE, 6),
    (NEW.id, 'Bonus', 'bonus', 'income', '🎉', '#f97316', TRUE, 7),
    (NEW.id, 'Refund', 'refund', 'income', '↩️', '#8b5cf6', TRUE, 8),
    (NEW.id, 'Other Income', 'other-income', 'income', '📌', '#64748b', TRUE, 9);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.seed_default_categories() FROM public;
REVOKE EXECUTE ON FUNCTION public.seed_default_categories() FROM anon;
REVOKE EXECUTE ON FUNCTION public.seed_default_categories() FROM authenticated;

-- 4. advance_recurring_rule
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.advance_recurring_rule(UUID) FROM public;
REVOKE EXECUTE ON FUNCTION public.advance_recurring_rule(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.advance_recurring_rule(UUID) TO authenticated, service_role;
