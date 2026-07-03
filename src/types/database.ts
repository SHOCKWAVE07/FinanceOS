// ==============================================
// Database Types for FinanceOS
// These types mirror the Supabase PostgreSQL schema
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      account_type: AccountType;
      category_type: CategoryType;
      theme_preference: ThemePreference;
    };
  };
};
