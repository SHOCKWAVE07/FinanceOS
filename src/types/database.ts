// ==============================================
// Database Types for FinanceOS
// These types mirror the Supabase PostgreSQL schema
// Phase 1: profiles, categories, tags, accounts
// Phase 2: expenses, expense_tags, attachments, recurring_rules
// ==============================================

// ── Core Enums ──────────────────────────────────
export type AccountType =
  | "savings"
  | "current"
  | "credit_card"
  | "wallet"
  | "cash"
  | "loan"
  | "other";

export type CategoryType = "expense" | "income" | "both";

export type ThemePreference = "light" | "dark" | "system";

// ── Profiles ────────────────────────────────────
export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  currency: string;
  locale: string;
  timezone: string;
  theme: ThemePreference;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileInsert {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  currency?: string;
  locale?: string;
  timezone?: string;
  theme?: ThemePreference;
  onboarding_completed?: boolean;
}

export interface ProfileUpdate {
  full_name?: string;
  avatar_url?: string | null;
  currency?: string;
  locale?: string;
  timezone?: string;
  theme?: ThemePreference;
  onboarding_completed?: boolean;
}

// ── Categories ──────────────────────────────────
export interface Category {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
  parent_id: string | null;
  sort_order: number;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryInsert {
  user_id: string;
  name: string;
  slug: string;
  type: CategoryType;
  icon?: string | null;
  color?: string | null;
  parent_id?: string | null;
  sort_order?: number;
  is_system?: boolean;
  is_active?: boolean;
}

export interface CategoryUpdate {
  name?: string;
  slug?: string;
  type?: CategoryType;
  icon?: string | null;
  color?: string | null;
  parent_id?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

// ── Tags ────────────────────────────────────────
export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export interface TagInsert {
  user_id: string;
  name: string;
  color?: string | null;
}

export interface TagUpdate {
  name?: string;
  color?: string | null;
}

// ── Accounts ────────────────────────────────────
export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  institution: string | null;
  balance: number;
  currency: string;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AccountInsert {
  user_id: string;
  name: string;
  type: AccountType;
  institution?: string | null;
  balance?: number;
  currency?: string;
  icon?: string | null;
  color?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

export interface AccountUpdate {
  name?: string;
  type?: AccountType;
  institution?: string | null;
  balance?: number;
  currency?: string;
  icon?: string | null;
  color?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

// ── Phase 2 Enums ───────────────────────────────
export type RecurringFrequency =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "yearly";

// ── Recurring Rules ─────────────────────────────
export interface RecurringRule {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  currency: string;
  category_id: string | null;
  account_id: string | null;
  notes: string | null;
  merchant: string | null;
  frequency: RecurringFrequency;
  interval_count: number;
  start_date: string;        // ISO date YYYY-MM-DD
  end_date: string | null;
  next_due_date: string;
  last_generated: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecurringRuleInsert {
  user_id: string;
  title: string;
  amount: number;
  currency?: string;
  category_id?: string | null;
  account_id?: string | null;
  notes?: string | null;
  merchant?: string | null;
  frequency: RecurringFrequency;
  interval_count?: number;
  start_date: string;
  end_date?: string | null;
  next_due_date: string;
}

export interface RecurringRuleUpdate {
  title?: string;
  amount?: number;
  currency?: string;
  category_id?: string | null;
  account_id?: string | null;
  notes?: string | null;
  merchant?: string | null;
  frequency?: RecurringFrequency;
  interval_count?: number;
  start_date?: string;
  end_date?: string | null;
  next_due_date?: string;
  is_active?: boolean;
}

// ── Expenses ─────────────────────────────────────
export interface Expense {
  id: string;
  user_id: string;
  account_id: string | null;
  category_id: string | null;
  recurring_rule_id: string | null;
  title: string;
  amount: number;
  currency: string;
  date: string;              // ISO date YYYY-MM-DD
  notes: string | null;
  merchant: string | null;
  is_recurring: boolean;
  is_reimbursable: boolean;
  is_reimbursed: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseInsert {
  user_id: string;
  title: string;
  amount: number;
  date: string;
  currency?: string;
  account_id?: string | null;
  category_id?: string | null;
  recurring_rule_id?: string | null;
  notes?: string | null;
  merchant?: string | null;
  is_recurring?: boolean;
  is_reimbursable?: boolean;
  is_reimbursed?: boolean;
}

export interface ExpenseUpdate {
  title?: string;
  amount?: number;
  date?: string;
  currency?: string;
  account_id?: string | null;
  category_id?: string | null;
  notes?: string | null;
  merchant?: string | null;
  is_reimbursable?: boolean;
  is_reimbursed?: boolean;
  deleted_at?: string | null;
}

/**
 * Joined shape used in UI queries.
 * Produced by getExpenses() / getExpenseById() server actions.
 */
export interface ExpenseWithRelations extends Expense {
  category: Pick<Category, "id" | "name" | "icon" | "color"> | null;
  account: Pick<Account, "id" | "name" | "type"> | null;
  tags: Tag[];
  attachments: Attachment[];
}

// ── Expense Tags (join table) ────────────────────
export interface ExpenseTag {
  expense_id: string;
  tag_id: string;
}

// ── Attachments ──────────────────────────────────
export interface Attachment {
  id: string;
  user_id: string;
  expense_id: string | null;
  note_id: string | null;    // populated in Phase 6
  name: string;
  size: number;              // bytes
  mime_type: string;
  storage_path: string;      // path inside Supabase Storage bucket
  created_at: string;
}

export interface AttachmentInsert {
  user_id: string;
  expense_id?: string | null;
  note_id?: string | null;
  name: string;
  size: number;
  mime_type: string;
  storage_path: string;
}

// ── Phase 3: Income & Salary Tracking ─────────────
export interface Income {
  id: string;
  user_id: string;
  account_id: string | null;
  category_id: string | null;
  recurring_rule_id: string | null;
  title: string;
  amount: number;
  currency: string;
  date: string;              // ISO date YYYY-MM-DD
  notes: string | null;
  source: string | null;
  is_recurring: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncomeInsert {
  user_id: string;
  title: string;
  amount: number;
  date: string;
  currency?: string;
  account_id?: string | null;
  category_id?: string | null;
  recurring_rule_id?: string | null;
  notes?: string | null;
  source?: string | null;
  is_recurring?: boolean;
}

export interface IncomeUpdate {
  title?: string;
  amount?: number;
  date?: string;
  currency?: string;
  account_id?: string | null;
  category_id?: string | null;
  notes?: string | null;
  source?: string | null;
  deleted_at?: string | null;
}

export interface IncomeWithRelations extends Income {
  category: Pick<Category, "id" | "name" | "icon" | "color"> | null;
  account: Pick<Account, "id" | "name" | "type"> | null;
  tags: Tag[];
}

export interface IncomeTag {
  income_id: string;
  tag_id: string;
}

export interface SalaryRecord {
  id: string;
  user_id: string;
  income_id: string | null;
  month: string;             // ISO date YYYY-MM-01
  company: string;
  designation: string;
  basic: number;
  hra: number;
  special_allowance: number;
  lta: number;
  pf_deduction: number;
  nps_deduction: number;
  tax_deduction: number;
  other_deductions: number;
  net_salary: number;
  gross_salary: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalaryRecordInsert {
  user_id: string;
  income_id?: string | null;
  month: string;
  company: string;
  designation: string;
  basic?: number;
  hra?: number;
  special_allowance?: number;
  lta?: number;
  pf_deduction?: number;
  nps_deduction?: number;
  tax_deduction?: number;
  other_deductions?: number;
  net_salary?: number;
  gross_salary?: number;
  notes?: string | null;
}

export interface SalaryRecordUpdate {
  income_id?: string | null;
  month?: string;
  company?: string;
  designation?: string;
  basic?: number;
  hra?: number;
  special_allowance?: number;
  lta?: number;
  pf_deduction?: number;
  nps_deduction?: number;
  tax_deduction?: number;
  other_deductions?: number;
  net_salary?: number;
  gross_salary?: number;
  notes?: string | null;
}

export interface SalaryAppraisal {
  id: string;
  user_id: string;
  company: string;
  designation: string;
  effective_date: string;    // YYYY-MM-DD
  previous_gross_salary: number;
  new_gross_salary: number;
  percentage_hike: number;   // Auto-calculated
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalaryAppraisalInsert {
  user_id: string;
  company: string;
  designation: string;
  effective_date: string;
  previous_gross_salary: number;
  new_gross_salary: number;
  notes?: string | null;
}

export interface SalaryAppraisalUpdate {
  company?: string;
  designation?: string;
  effective_date?: string;
  previous_gross_salary?: number;
}

export interface Investment {
  id: string;
  user_id: string;
  account_id: string | null;
  name: string;
  type: 'mutual_fund' | 'stock' | 'crypto' | 'gold' | 'fixed_deposit' | 'ppf' | 'nps' | 'real_estate' | 'other';
  institution: string;
  invested_amount: number;
  current_value: number;
  quantity: number | null;
  avg_buy_price: number | null;
  currency: string;
  start_date: string;
  notes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvestmentInsert {
  user_id: string;
  account_id?: string | null;
  name: string;
  type: 'mutual_fund' | 'stock' | 'crypto' | 'gold' | 'fixed_deposit' | 'ppf' | 'nps' | 'real_estate' | 'other';
  institution: string;
  invested_amount?: number;
  current_value?: number;
  quantity?: number | null;
  avg_buy_price?: number | null;
  currency?: string;
  start_date?: string;
  notes?: string | null;
}

export interface InvestmentUpdate {
  account_id?: string | null;
  name?: string;
  type?: 'mutual_fund' | 'stock' | 'crypto' | 'gold' | 'fixed_deposit' | 'ppf' | 'nps' | 'real_estate' | 'other';
  institution?: string;
  invested_amount?: number;
  current_value?: number;
  quantity?: number | null;
  avg_buy_price?: number | null;
  currency?: string;
  start_date?: string;
  notes?: string | null;
}

export interface InvestmentValuation {
  id: string;
  investment_id: string;
  valuation_date: string;
  value: number;
  invested_amount: number;
  created_at: string;
}

export interface InvestmentValuationInsert {
  investment_id: string;
  valuation_date?: string;
  value: number;
  invested_amount: number;
}

export interface InvestmentValuationUpdate {
  valuation_date?: string;
  value?: number;
  invested_amount?: number;
}

// ── Phase 5 Goals & Milestones ──────────────────────
export interface Goal {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  target_amount: number;
  target_date: string; // YYYY-MM-DD
  category: 'retirement' | 'house' | 'car' | 'education' | 'vacation' | 'emergency_fund' | 'other';
  status: 'active' | 'completed' | 'paused' | 'abandoned';
  priority: 'low' | 'medium' | 'high' | 'critical';
  manual_savings: number;
  created_at: string;
  updated_at: string;
}

export interface GoalInsert {
  user_id: string;
  name: string;
  description?: string | null;
  target_amount: number;
  target_date: string;
  category: 'retirement' | 'house' | 'car' | 'education' | 'vacation' | 'emergency_fund' | 'other';
  status?: 'active' | 'completed' | 'paused' | 'abandoned';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  manual_savings?: number;
}

export interface GoalUpdate {
  name?: string;
  description?: string | null;
  target_amount?: number;
  target_date?: string;
  category?: 'retirement' | 'house' | 'car' | 'education' | 'vacation' | 'emergency_fund' | 'other';
  status?: 'active' | 'completed' | 'paused' | 'abandoned';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  manual_savings?: number;
}

export interface GoalInvestment {
  goal_id: string;
  investment_id: string;
  allocated_share: number; // percentage
  created_at: string;
}

export interface Milestone {
  id: string;
  goal_id: string;
  name: string;
  target_amount: number | null;
  target_date: string | null;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MilestoneInsert {
  goal_id: string;
  name: string;
  target_amount?: number | null;
  target_date?: string | null;
  is_completed?: boolean;
  completed_at?: string | null;
}

export interface MilestoneUpdate {
  name?: string;
  target_amount?: number | null;
  target_date?: string | null;
  is_completed?: boolean;
  completed_at?: string | null;
}

// ── Notes ───────────────────────────────────────
export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NoteInsert {
  id?: string;
  user_id?: string;
  title: string;
  content?: string;
  deleted_at?: string | null;
}

export interface NoteUpdate {
  title?: string;
  content?: string;
  deleted_at?: string | null;
}

export interface NoteTag {
  note_id: string;
  tag_id: string;
}

export interface NoteLink {
  note_id: string;
  link_type: "expense" | "income" | "investment" | "goal";
  link_id: string;
}

export interface NoteWithRelations extends Note {
  tags: Tag[];
  links: NoteLink[];
  attachments: Attachment[];
}

export interface TimelineEvent {
  event_id: string;
  user_id: string;
  event_date: string;
  event_type:
    | "expense"
    | "income"
    | "salary"
    | "investment_purchase"
    | "note"
    | "milestone_achieved"
    | "milestone_pending";
  title: string;
  amount: number | null;
  currency: string;
  description: string | null;
}

export interface InvestmentFilters {
  search?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "name" | "invested_amount" | "current_value" | "start_date" | "created_at";
  sortOrder?: "asc" | "desc";
}

// ── Pagination helpers ────────────────────────────
export interface PaginatedResult<T> {
  data: T[];
  count: number;        // total rows matching filters
  page: number;
  pageSize: number;
  pageCount: number;
}

// ── Expense Filters (used by getExpenses) ─────────
export interface ExpenseFilters {
  search?: string;
  categoryId?: string;
  accountId?: string;
  tagIds?: string[];
  startDate?: string;   // YYYY-MM-DD
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  isRecurring?: boolean;
  isReimbursable?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: "date" | "amount" | "title" | "created_at";
  sortOrder?: "asc" | "desc";
}

// ── Income Filters (used by getIncomes) ───────────
export interface IncomeFilters {
  search?: string;
  categoryId?: string;
  accountId?: string;
  tagIds?: string[];
  startDate?: string;   // YYYY-MM-DD
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  isRecurring?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: "date" | "amount" | "title" | "created_at";
  sortOrder?: "asc" | "desc";
}

// ── Supabase Database Schema ────────────────────
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      categories: {
        Row: Category;
        Insert: CategoryInsert;
        Update: CategoryUpdate;
        Relationships: [];
      };
      tags: {
        Row: Tag;
        Insert: TagInsert;
        Update: TagUpdate;
        Relationships: [];
      };
      accounts: {
        Row: Account;
        Insert: AccountInsert;
        Update: AccountUpdate;
        Relationships: [];
      };
      // ── Phase 2 ────────────────────────────────
      recurring_rules: {
        Row: RecurringRule;
        Insert: RecurringRuleInsert;
        Update: RecurringRuleUpdate;
        Relationships: [];
      };
      expenses: {
        Row: Expense;
        Insert: ExpenseInsert;
        Update: ExpenseUpdate;
        Relationships: [];
      };
      expense_tags: {
        Row: ExpenseTag;
        Insert: ExpenseTag;
        Update: Partial<ExpenseTag>;
        Relationships: [];
      };
      attachments: {
        Row: Attachment;
        Insert: AttachmentInsert;
        Update: Partial<AttachmentInsert>;
        Relationships: [];
      };
      // ── Phase 3 ────────────────────────────────
      incomes: {
        Row: Income;
        Insert: IncomeInsert;
        Update: IncomeUpdate;
        Relationships: [];
      };
      income_tags: {
        Row: IncomeTag;
        Insert: IncomeTag;
        Update: Partial<IncomeTag>;
        Relationships: [];
      };
      salary_records: {
        Row: SalaryRecord;
        Insert: SalaryRecordInsert;
        Update: SalaryRecordUpdate;
        Relationships: [];
      };
      salary_appraisals: {
        Row: SalaryAppraisal;
        Insert: SalaryAppraisalInsert;
        Update: SalaryAppraisalUpdate;
        Relationships: [];
      };
      // ── Phase 4 ────────────────────────────────
      investments: {
        Row: Investment;
        Insert: InvestmentInsert;
        Update: InvestmentUpdate;
        Relationships: [];
      };
      investment_valuations: {
        Row: InvestmentValuation;
        Insert: InvestmentValuationInsert;
        Update: InvestmentValuationUpdate;
        Relationships: [];
      };
      // ── Phase 5 ────────────────────────────────
      goals: {
        Row: Goal;
        Insert: GoalInsert;
        Update: GoalUpdate;
        Relationships: [];
      };
      goal_investments: {
        Row: GoalInvestment;
        Insert: GoalInvestment;
        Update: Partial<GoalInvestment>;
        Relationships: [];
      };
      milestones: {
        Row: Milestone;
        Insert: MilestoneInsert;
        Update: MilestoneUpdate;
        Relationships: [];
      };
      notes: {
        Row: Note;
        Insert: NoteInsert;
        Update: NoteUpdate;
        Relationships: [];
      };
      note_tags: {
        Row: NoteTag;
        Insert: NoteTag;
        Update: Partial<NoteTag>;
        Relationships: [];
      };
      note_links: {
        Row: NoteLink;
        Insert: NoteLink;
        Update: Partial<NoteLink>;
        Relationships: [];
      };
    };
    Views: {
      active_expenses: {
        Row: Expense;
      };
      active_incomes: {
        Row: Income;
      };
      active_investments: {
        Row: Investment;
      };
      active_notes: {
        Row: Note;
      };
      timeline_events: {
        Row: TimelineEvent;
      };
    };
    Functions: {
      advance_recurring_rule: {
        Args: { rule_id: string };
        Returns: void;
      };
    };
    Enums: {
      account_type: AccountType;
      category_type: CategoryType;
      theme_preference: ThemePreference;
      recurring_frequency: RecurringFrequency;
    };
  };
};
