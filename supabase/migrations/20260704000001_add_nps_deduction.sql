-- ==============================================
-- Add nps_deduction to public.salary_records
-- Migration: 20260704000001_add_nps_deduction.sql
-- ==============================================

ALTER TABLE public.salary_records
ADD COLUMN IF NOT EXISTS nps_deduction NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (nps_deduction >= 0);
