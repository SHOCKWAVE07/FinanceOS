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
    };
    Views: {
      active_expenses: {
        Row: Expense;
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
