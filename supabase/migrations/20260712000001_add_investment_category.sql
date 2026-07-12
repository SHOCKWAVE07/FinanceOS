-- ==============================================
-- 20260712000001_add_investment_category.sql
-- Support dynamic investment categories in categories table
-- ==============================================

-- 1. Alter categories type CHECK constraint to include 'investment'
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_type_check;
ALTER TABLE public.categories ADD CONSTRAINT categories_type_check CHECK (type IN ('expense', 'income', 'both', 'investment'));

-- 2. Drop constraints on investments.type to allow custom category slugs
ALTER TABLE public.investments DROP CONSTRAINT IF EXISTS investments_type_check;

-- 3. Update seed_default_categories() function to also seed investment categories for new users
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

    -- Seed default investment categories
    INSERT INTO public.categories (user_id, name, slug, type, icon, color, is_system, sort_order) VALUES
    (NEW.id, 'Mutual Fund', 'mutual_fund', 'investment', '📊', '#3b82f6', TRUE, 1),
    (NEW.id, 'Equity/Stock', 'stock', 'investment', '📈', '#10b981', TRUE, 2),
    (NEW.id, 'Crypto Asset', 'crypto', 'investment', '🪙', '#f59e0b', TRUE, 3),
    (NEW.id, 'Gold', 'gold', 'investment', '👑', '#eab308', TRUE, 4),
    (NEW.id, 'Fixed Deposit', 'fixed_deposit', 'investment', '🏦', '#6366f1', TRUE, 5),
    (NEW.id, 'PPF', 'ppf', 'investment', '🛡️', '#14b8a6', TRUE, 6),
    (NEW.id, 'NPS', 'nps', 'investment', '👴', '#8b5cf6', TRUE, 7),
    (NEW.id, 'Real Estate', 'real_estate', 'investment', '🏠', '#ec4899', TRUE, 8),
    (NEW.id, 'Other', 'other', 'investment', '📌', '#64748b', TRUE, 9);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Seed default investment categories for all existing profiles
INSERT INTO public.categories (user_id, name, slug, type, icon, color, is_system, sort_order)
SELECT p.id, c.name, c.slug, c.type, c.icon, c.color, c.is_system, c.sort_order
FROM public.profiles p
CROSS JOIN (
    VALUES 
    ('Mutual Fund', 'mutual_fund', 'investment', '📊', '#3b82f6', TRUE, 1),
    ('Equity/Stock', 'stock', 'investment', '📈', '#10b981', TRUE, 2),
    ('Crypto Asset', 'crypto', 'investment', '🪙', '#f59e0b', TRUE, 3),
    ('Gold', 'gold', 'investment', '👑', '#eab308', TRUE, 4),
    ('Fixed Deposit', 'fixed_deposit', 'investment', '🏦', '#6366f1', TRUE, 5),
    ('PPF', 'ppf', 'investment', '🛡️', '#14b8a6', TRUE, 6),
    ('NPS', 'nps', 'investment', '👴', '#8b5cf6', TRUE, 7),
    ('Real Estate', 'real_estate', 'investment', '🏠', '#ec4899', TRUE, 8),
    ('Other', 'other', 'investment', '📌', '#64748b', TRUE, 9)
) AS c(name, slug, type, icon, color, is_system, sort_order)
ON CONFLICT (user_id, slug, type) DO NOTHING;
