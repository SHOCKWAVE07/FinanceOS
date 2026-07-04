-- ==============================================
-- Performance Optimization: Index Unindexed Foreign Keys
-- Migration: 20260706000005_index_foreign_keys.sql
-- ==============================================

-- 1. categories
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);

-- 2. tags
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags(user_id);

-- 3. accounts
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);

-- 4. recurring_rules
CREATE INDEX IF NOT EXISTS idx_recurring_rules_user_id ON public.recurring_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_rules_category_id ON public.recurring_rules(category_id);
CREATE INDEX IF NOT EXISTS idx_recurring_rules_account_id ON public.recurring_rules(account_id);

-- 5. expenses
CREATE INDEX IF NOT EXISTS idx_expenses_recurring_rule_id ON public.expenses(recurring_rule_id);

-- 6. expense_tags
CREATE INDEX IF NOT EXISTS idx_expense_tags_tag_id ON public.expense_tags(tag_id);

-- 7. attachments
CREATE INDEX IF NOT EXISTS idx_attachments_user_id ON public.attachments(user_id);

-- 8. incomes
CREATE INDEX IF NOT EXISTS idx_incomes_recurring_rule_id ON public.incomes(recurring_rule_id);

-- 9. income_tags
CREATE INDEX IF NOT EXISTS idx_income_tags_tag_id ON public.income_tags(tag_id);

-- 10. salary_records
CREATE INDEX IF NOT EXISTS idx_salary_records_income_id ON public.salary_records(income_id);

-- 11. investment_valuations
CREATE INDEX IF NOT EXISTS idx_investment_valuations_investment_id ON public.investment_valuations(investment_id);

-- 12. goals
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);

-- 13. goal_investments
CREATE INDEX IF NOT EXISTS idx_goal_investments_investment_id ON public.goal_investments(investment_id);

-- 14. milestones
CREATE INDEX IF NOT EXISTS idx_milestones_goal_id ON public.milestones(goal_id);

-- 15. note_tags
CREATE INDEX IF NOT EXISTS idx_note_tags_tag_id ON public.note_tags(tag_id);
