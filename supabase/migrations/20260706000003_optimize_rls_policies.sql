-- ==============================================
-- Performance Optimization: Optimize RLS Policies with subqueries
-- Migration: 20260706000003_optimize_rls_policies.sql
-- ==============================================

-- 1. Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (id = (select auth.uid()));

-- 2. Categories
DROP POLICY IF EXISTS "Users can manage own categories" ON public.categories;
CREATE POLICY "Users can manage own categories"
    ON public.categories FOR ALL
    USING (user_id = (select auth.uid()));

-- 3. Tags
DROP POLICY IF EXISTS "Users can manage own tags" ON public.tags;
CREATE POLICY "Users can manage own tags"
    ON public.tags FOR ALL
    USING (user_id = (select auth.uid()));

-- 4. Accounts
DROP POLICY IF EXISTS "Users can manage own accounts" ON public.accounts;
CREATE POLICY "Users can manage own accounts"
    ON public.accounts FOR ALL
    USING (user_id = (select auth.uid()));

-- 5. Recurring Rules
DROP POLICY IF EXISTS "Users can manage own recurring rules" ON public.recurring_rules;
CREATE POLICY "Users can manage own recurring rules"
    ON public.recurring_rules FOR ALL
    USING (user_id = (select auth.uid()));

-- 6. Expenses
DROP POLICY IF EXISTS "Users can manage own expenses" ON public.expenses;
CREATE POLICY "Users can manage own expenses"
    ON public.expenses FOR ALL
    USING (user_id = (select auth.uid()));

-- 7. Expense Tags
DROP POLICY IF EXISTS "Users can manage own expense tags" ON public.expense_tags;
CREATE POLICY "Users can manage own expense tags"
    ON public.expense_tags FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.expenses e
            WHERE e.id = expense_id
              AND e.user_id = (select auth.uid())
        )
    );

-- 8. Attachments
DROP POLICY IF EXISTS "Users can manage own attachments" ON public.attachments;
CREATE POLICY "Users can manage own attachments"
    ON public.attachments FOR ALL
    USING (user_id = (select auth.uid()));

-- 9. Incomes
DROP POLICY IF EXISTS "Users can manage own incomes" ON public.incomes;
CREATE POLICY "Users can manage own incomes"
    ON public.incomes FOR ALL
    USING (user_id = (select auth.uid()));

-- 10. Income Tags
DROP POLICY IF EXISTS "Users can manage own income tags" ON public.income_tags;
CREATE POLICY "Users can manage own income tags"
    ON public.income_tags FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.incomes i
            WHERE i.id = income_id
              AND i.user_id = (select auth.uid())
        )
    );

-- 11. Salary Records
DROP POLICY IF EXISTS "Users can manage own salary records" ON public.salary_records;
CREATE POLICY "Users can manage own salary records"
    ON public.salary_records FOR ALL
    USING (user_id = (select auth.uid()));

-- 12. Salary Appraisals
DROP POLICY IF EXISTS "Users can manage own appraisals" ON public.salary_appraisals;
CREATE POLICY "Users can manage own appraisals"
    ON public.salary_appraisals FOR ALL
    USING (user_id = (select auth.uid()));

-- 13. Investments
DROP POLICY IF EXISTS "Users can manage own investments" ON public.investments;
CREATE POLICY "Users can manage own investments"
    ON public.investments FOR ALL
    USING (user_id = (select auth.uid()));

-- 14. Investment Valuations
DROP POLICY IF EXISTS "Users can manage own investment valuations" ON public.investment_valuations;
CREATE POLICY "Users can manage own investment valuations"
    ON public.investment_valuations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.investments i
            WHERE i.id = investment_id
              AND i.user_id = (select auth.uid())
        )
    );

-- 15. Goals
DROP POLICY IF EXISTS "Users can manage own goals" ON public.goals;
CREATE POLICY "Users can manage own goals"
    ON public.goals FOR ALL
    USING (user_id = (select auth.uid()));

-- 16. Goal Investments
DROP POLICY IF EXISTS "Users can manage goal investments link" ON public.goal_investments;
CREATE POLICY "Users can manage goal investments link"
    ON public.goal_investments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.goals g
            WHERE g.id = goal_id
              AND g.user_id = (select auth.uid())
        )
    );

-- 17. Milestones
DROP POLICY IF EXISTS "Users can manage milestones" ON public.milestones;
CREATE POLICY "Users can manage milestones"
    ON public.milestones FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.goals g
            WHERE g.id = goal_id
              AND g.user_id = (select auth.uid())
        )
    );

-- 18. Notes
DROP POLICY IF EXISTS "Users can manage own notes" ON public.notes;
CREATE POLICY "Users can manage own notes"
    ON public.notes FOR ALL
    USING (user_id = (select auth.uid()));

-- 19. Note Tags
DROP POLICY IF EXISTS "Users can manage own note tags" ON public.note_tags;
CREATE POLICY "Users can manage own note tags"
    ON public.note_tags FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.notes n
            WHERE n.id = note_id
              AND n.user_id = (select auth.uid())
        )
    );

-- 20. Note Links
DROP POLICY IF EXISTS "Users can manage own note links" ON public.note_links;
CREATE POLICY "Users can manage own note links"
    ON public.note_links FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.notes n
            WHERE n.id = note_id
              AND n.user_id = (select auth.uid())
        )
    );
