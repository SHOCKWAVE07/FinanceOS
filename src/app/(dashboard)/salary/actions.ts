"use server";

// ==============================================
// Salary Server Actions — Phase 3
// Auth-checked, Zod-validated CRUD operations
// for Payslips and Appraisals.
// ==============================================

import { revalidatePath } from "next/cache";
import { createActionClient } from "@/lib/supabase/action-client";
import {
  salaryRecordSchema,
  salaryAppraisalSchema,
  type SalaryRecordFormValues,
  type SalaryAppraisalFormValues,
} from "@/lib/validations/salary.schemas";
import type {
  SalaryRecord,
  SalaryAppraisal,
  Category,
  Account,
} from "@/types/database";

// ── Auth helper ──────────────────────────────────

async function requireAuth() {
  const supabase = await createActionClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  return { supabase, userId: user.id };
}

// ── Action result type ───────────────────────────

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ═══════════════════════════════════════════════
// SALARY RECORDS (PAYSLIPS) CRUD
// ═══════════════════════════════════════════════

export async function getSalaryRecords(): Promise<ActionResult<SalaryRecord[]>> {
  try {
    const { supabase, userId } = await requireAuth();

    const { data, error } = await supabase
      .from("salary_records")
      .select("*")
      .eq("user_id", userId)
      .order("month", { ascending: false });

    if (error) throw error;
    return { ok: true, data: data as SalaryRecord[] };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function createSalaryRecord(
  raw: SalaryRecordFormValues
): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase, userId } = await requireAuth();
    const parsed = salaryRecordSchema.parse(raw);

    // Fetch old sums before inserting new record
    const { pf: oldPfSum, nps: oldNpsSum } = await getExistingDeductionsSum(supabase, userId);

    // Calculate gross & net salary
    const gross = parsed.basic + parsed.hra + parsed.special_allowance + parsed.lta;
    const net = gross - parsed.pf_deduction - parsed.nps_deduction - parsed.tax_deduction - parsed.other_deductions;

    let incomeId: string | null = null;

    // 1. If checked, create corresponding Income Transaction
    if (parsed.create_income_transaction) {
      // Find or create "Salary" category for incomes
      let salaryCategoryId: string | null = null;
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("user_id", userId)
        .eq("type", "income")
        .eq("slug", "salary")
        .maybeSingle();

      if (cat) {
        salaryCategoryId = cat.id;
      } else {
        // Create category
        const { data: newCat, error: catErr } = await supabase
          .from("categories")
          .insert({
            user_id: userId,
            name: "Salary",
            slug: "salary",
            type: "income",
            icon: "Briefcase",
            color: "hsl(142, 71%, 45%)", // Success green
          })
          .select("id")
          .single();
        if (!catErr && newCat) {
          salaryCategoryId = newCat.id;
        }
      }

      // Format month name for title: e.g. "Salary - July 2026"
      const dateObj = new Date(parsed.month);
      const monthLabel = dateObj.toLocaleString("default", { month: "long", year: "numeric" });

      let targetAccountId = parsed.account_id;
      if (!targetAccountId) {
        const { data: defaultAcc } = await supabase
          .from("accounts")
          .select("id")
          .eq("user_id", userId)
          .eq("is_active", true)
          .eq("is_default", true)
          .maybeSingle();
        if (defaultAcc) {
          targetAccountId = defaultAcc.id;
        } else {
          const { data: fallbackAcc } = await supabase
            .from("accounts")
            .select("id")
            .eq("user_id", userId)
            .eq("is_active", true)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();
          if (fallbackAcc) targetAccountId = fallbackAcc.id;
        }
      }

      const { data: newIncome, error: incErr } = await supabase
        .from("incomes")
        .insert({
          user_id: userId,
          title: `Salary - ${monthLabel}`,
          amount: net,
          date: parsed.month,
          category_id: salaryCategoryId,
          account_id: targetAccountId,
          source: parsed.company,
          notes: `Generated automatically from payslip entry. Designation: ${parsed.designation}.`,
          is_recurring: false,
        })
        .select("id")
        .single();

      if (incErr) throw incErr;
      incomeId = newIncome.id;
    }

    // 2. Create Salary Record
    const { data: newRecord, error: recErr } = await supabase
      .from("salary_records")
      .insert({
        user_id: userId,
        income_id: incomeId,
        month: parsed.month,
        company: parsed.company,
        designation: parsed.designation,
        basic: parsed.basic,
        hra: parsed.hra,
        special_allowance: parsed.special_allowance,
        lta: parsed.lta,
        pf_deduction: parsed.pf_deduction,
        nps_deduction: parsed.nps_deduction,
        tax_deduction: parsed.tax_deduction,
        other_deductions: parsed.other_deductions,
        gross_salary: gross,
        net_salary: net,
        notes: parsed.notes || null,
      })
      .select("id")
      .single();

    if (recErr) {
      // Clean up orphaned income transaction if salary record creation failed
      if (incomeId) {
        await supabase.from("incomes").delete().eq("id", incomeId);
      }
      throw recErr;
    }

    // Sync PF and NPS deductions to investments module
    await syncSalaryDeductionsToInvestments(supabase, userId, oldPfSum, oldNpsSum);

    revalidatePath("/salary");
    revalidatePath("/income");
    revalidatePath("/dashboard");
    return { ok: true, data: { id: newRecord.id } };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function updateSalaryRecord(
  id: string,
  raw: SalaryRecordFormValues
): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireAuth();
    const parsed = salaryRecordSchema.parse(raw);

    // Fetch old sums before updating record
    const { pf: oldPfSum, nps: oldNpsSum } = await getExistingDeductionsSum(supabase, userId);

    // Fetch original to check linked income
    const { data: orig, error: origErr } = await supabase
      .from("salary_records")
      .select("income_id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (origErr || !orig) throw new Error("Salary record not found");

    const gross = parsed.basic + parsed.hra + parsed.special_allowance + parsed.lta;
    const net = gross - parsed.pf_deduction - parsed.nps_deduction - parsed.tax_deduction - parsed.other_deductions;

    let linkedIncomeId = orig.income_id;

    // Handle updates to linked income
    if (parsed.create_income_transaction) {
      const dateObj = new Date(parsed.month);
      const monthLabel = dateObj.toLocaleString("default", { month: "long", year: "numeric" });

      let targetAccountId = parsed.account_id;
      if (!targetAccountId) {
        const { data: defaultAcc } = await supabase
          .from("accounts")
          .select("id")
          .eq("user_id", userId)
          .eq("is_active", true)
          .eq("is_default", true)
          .maybeSingle();
        if (defaultAcc) {
          targetAccountId = defaultAcc.id;
        } else {
          const { data: fallbackAcc } = await supabase
            .from("accounts")
            .select("id")
            .eq("user_id", userId)
            .eq("is_active", true)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();
          if (fallbackAcc) targetAccountId = fallbackAcc.id;
        }
      }

      if (linkedIncomeId) {
        // Update existing income
        const { error: incErr } = await supabase
          .from("incomes")
          .update({
            title: `Salary - ${monthLabel}`,
            amount: net,
            date: parsed.month,
            account_id: targetAccountId,
            source: parsed.company,
            notes: `Generated automatically from payslip entry. Designation: ${parsed.designation}.`,
          })
          .eq("id", linkedIncomeId)
          .eq("user_id", userId);
        if (incErr) throw incErr;
      } else {
        // Create new income and link it
        let salaryCategoryId: string | null = null;
        const { data: cat } = await supabase
          .from("categories")
          .select("id")
          .eq("user_id", userId)
          .eq("type", "income")
          .eq("slug", "salary")
          .maybeSingle();

        if (cat) {
          salaryCategoryId = cat.id;
        } else {
          const { data: newCat } = await supabase
            .from("categories")
            .insert({
              user_id: userId,
              name: "Salary",
              slug: "salary",
              type: "income",
              icon: "Briefcase",
              color: "hsl(142, 71%, 45%)",
            })
            .select("id")
            .single();
          if (newCat) salaryCategoryId = newCat.id;
        }

        const { data: newIncome, error: incErr } = await supabase
          .from("incomes")
          .insert({
            user_id: userId,
            title: `Salary - ${monthLabel}`,
            amount: net,
            date: parsed.month,
            category_id: salaryCategoryId,
            account_id: targetAccountId,
            source: parsed.company,
            notes: `Generated automatically from payslip entry. Designation: ${parsed.designation}.`,
            is_recurring: false,
          })
          .select("id")
          .single();

        if (incErr) throw incErr;
        linkedIncomeId = newIncome.id;
      }
    } else if (!parsed.create_income_transaction && linkedIncomeId) {
      // Delete previously linked income
      await supabase.from("incomes").delete().eq("id", linkedIncomeId).eq("user_id", userId);
      linkedIncomeId = null;
    }

    // Update Salary Record
    const { error: recErr } = await supabase
      .from("salary_records")
      .update({
        income_id: linkedIncomeId,
        month: parsed.month,
        company: parsed.company,
        designation: parsed.designation,
        basic: parsed.basic,
        hra: parsed.hra,
        special_allowance: parsed.special_allowance,
        lta: parsed.lta,
        pf_deduction: parsed.pf_deduction,
        nps_deduction: parsed.nps_deduction,
        tax_deduction: parsed.tax_deduction,
        other_deductions: parsed.other_deductions,
        gross_salary: gross,
        net_salary: net,
        notes: parsed.notes || null,
      })
      .eq("id", id)
      .eq("user_id", userId);

    if (recErr) throw recErr;

    // Sync PF and NPS deductions to investments module
    await syncSalaryDeductionsToInvestments(supabase, userId, oldPfSum, oldNpsSum);

    revalidatePath("/salary");
    revalidatePath("/income");
    revalidatePath("/dashboard");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function deleteSalaryRecord(id: string): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireAuth();

    // Get linked income before deletion
    const { data: record, error: recErr } = await supabase
      .from("salary_records")
      .select("income_id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (recErr || !record) throw new Error("Salary record not found");

    // Delete linked income transaction if any
    if (record.income_id) {
      await supabase.from("incomes").delete().eq("id", record.income_id).eq("user_id", userId);
    }

    // Fetch old sums before deleting record
    const { pf: oldPfSum, nps: oldNpsSum } = await getExistingDeductionsSum(supabase, userId);

    // Delete Salary Record
    const { error } = await supabase
      .from("salary_records")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;

    // Sync PF and NPS deductions to investments module
    await syncSalaryDeductionsToInvestments(supabase, userId, oldPfSum, oldNpsSum);

    revalidatePath("/salary");
    revalidatePath("/income");
    revalidatePath("/dashboard");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ═══════════════════════════════════════════════
// SALARY APPRAISALS (HIKES) CRUD
// ═══════════════════════════════════════════════

export async function getSalaryAppraisals(): Promise<ActionResult<SalaryAppraisal[]>> {
  try {
    const { supabase, userId } = await requireAuth();

    const { data, error } = await supabase
      .from("salary_appraisals")
      .select("*")
      .eq("user_id", userId)
      .order("effective_date", { ascending: false });

    if (error) throw error;
    return { ok: true, data: data as SalaryAppraisal[] };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function createSalaryAppraisal(
  raw: SalaryAppraisalFormValues
): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase, userId } = await requireAuth();
    const parsed = salaryAppraisalSchema.parse(raw);

    const { data, error } = await supabase
      .from("salary_appraisals")
      .insert({
        user_id: userId,
        company: parsed.company,
        designation: parsed.designation,
        effective_date: parsed.effective_date,
        previous_gross_salary: parsed.previous_gross_salary,
        new_gross_salary: parsed.new_gross_salary,
        notes: parsed.notes || null,
      })
      .select("id")
      .single();

    if (error) throw error;

    revalidatePath("/salary");
    return { ok: true, data: { id: data.id } };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function updateSalaryAppraisal(
  id: string,
  raw: SalaryAppraisalFormValues
): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireAuth();
    const parsed = salaryAppraisalSchema.parse(raw);

    const { error } = await supabase
      .from("salary_appraisals")
      .update({
        company: parsed.company,
        designation: parsed.designation,
        effective_date: parsed.effective_date,
        previous_gross_salary: parsed.previous_gross_salary,
        new_gross_salary: parsed.new_gross_salary,
        notes: parsed.notes || null,
      })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;

    revalidatePath("/salary");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function deleteSalaryAppraisal(id: string): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireAuth();

    const { error } = await supabase
      .from("salary_appraisals")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;

    revalidatePath("/salary");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ═══════════════════════════════════════════════
// SALARY STATS & ANCHORS
// ═══════════════════════════════════════════════

export interface SalaryStats {
  latestGrossSalary: number;
  latestNetSalary: number;
  latestDesignation: string | null;
  latestCompany: string | null;
  totalHikesCount: number;
  averageHikePercent: number;
  chartData: { month: string; gross: number; net: number }[];
}

export async function getSalaryStats(): Promise<ActionResult<SalaryStats>> {
  try {
    const { supabase, userId } = await requireAuth();

    // 1. Fetch all salary records to get trends (Gross vs Net over time)
    const { data: records, error: recErr } = await supabase
      .from("salary_records")
      .select("month, gross_salary, net_salary, designation, company")
      .eq("user_id", userId)
      .order("month", { ascending: true });

    if (recErr) throw recErr;

    // 2. Fetch all appraisals to calculate hikes metrics
    const { data: appraisals, error: appErr } = await supabase
      .from("salary_appraisals")
      .select("percentage_hike")
      .eq("user_id", userId);

    if (appErr) throw appErr;

    const latest = records.length > 0 ? records[records.length - 1] : null;

    // Calculate hike details
    const totalHikesCount = appraisals?.length ?? 0;
    const averageHikePercent =
      totalHikesCount > 0
        ? appraisals.reduce((sum, app) => sum + Number(app.percentage_hike), 0) / totalHikesCount
        : 0;

    // Chart data mapping: e.g. "2026-07-01" -> "Jul 26"
    const chartData = (records ?? []).slice(-12).map((r) => {
      const date = new Date(r.month);
      const label = date.toLocaleString("default", { month: "short", year: "2-digit" });
      return {
        month: label,
        gross: Number(r.gross_salary),
        net: Number(r.net_salary),
      };
    });

    return {
      ok: true,
      data: {
        latestGrossSalary: latest ? Number(latest.gross_salary) : 0,
        latestNetSalary: latest ? Number(latest.net_salary) : 0,
        latestDesignation: latest ? latest.designation : null,
        latestCompany: latest ? latest.company : null,
        totalHikesCount,
        averageHikePercent,
        chartData,
      },
    };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// Helper to sum existing salary deductions
async function getExistingDeductionsSum(supabase: any, userId: string) {
  const { data: existingSalaries } = await supabase
    .from("salary_records")
    .select("pf_deduction, nps_deduction")
    .eq("user_id", userId);
  
  const pf = (existingSalaries || []).reduce((acc: number, cur: any) => acc + Number(cur.pf_deduction || 0), 0);
  const nps = (existingSalaries || []).reduce((acc: number, cur: any) => acc + Number(cur.nps_deduction || 0), 0);
  return { pf, nps };
}

// ── Ledger sync to investments ──────────────────
async function syncSalaryDeductionsToInvestments(
  supabase: any,
  userId: string,
  oldPfSum: number,
  oldNpsSum: number
): Promise<void> {
  const { data: records, error } = await supabase
    .from("salary_records")
    .select("month, pf_deduction, nps_deduction")
    .eq("user_id", userId)
    .order("month", { ascending: true });

  if (error) throw error;

  const validRecords = records || [];

  const syncType = async (
    type: "ppf" | "nps",
    name: string,
    institution: string,
    oldSum: number,
    getDeduction: (r: any) => number
  ) => {
    const newSum = validRecords.reduce((acc: number, r: any) => acc + getDeduction(r), 0);
    const diff = newSum - oldSum;

    let { data: asset, error: assetErr } = await supabase
      .from("investments")
      .select("*")
      .eq("user_id", userId)
      .eq("type", type)
      .is("deleted_at", null)
      .maybeSingle();

    if (assetErr) throw assetErr;

    let assetId = asset?.id;
    if (!assetId) {
      if (newSum === 0) return;
      const { data: newAsset, error: createErr } = await supabase
        .from("investments")
        .insert({
          user_id: userId,
          name,
          type,
          institution,
          invested_amount: newSum,
          current_value: newSum,
          start_date: validRecords[0]?.month || new Date().toISOString().split("T")[0],
        })
        .select("id")
        .single();

      if (createErr) throw createErr;
      assetId = newAsset.id;
    } else {
      if (diff === 0) return;
      const newInvested = Math.max(0, Number(asset.invested_amount) + diff);
      const newCurrent = Math.max(0, Number(asset.current_value) + diff);
      
      const { error: updateErr } = await supabase
        .from("investments")
        .update({
          invested_amount: newInvested,
          current_value: newCurrent,
        })
        .eq("id", assetId);

      if (updateErr) throw updateErr;
    }

    // Upsert valuation history points for all salary months
    let runningSum = 0;
    for (const r of validRecords) {
      runningSum += getDeduction(r);
      await supabase
        .from("investment_valuations")
        .upsert({
          investment_id: assetId,
          valuation_date: r.month,
          value: runningSum,
          invested_amount: runningSum,
        }, {
          onConflict: "investment_id,valuation_date"
        });
    }
  };

  await syncType("ppf", "Provident Fund (EPF)", "EPFO", oldPfSum, (r) => Number(r.pf_deduction || 0));
  await syncType("nps", "NPS Portfolio", "NPS Trust", oldNpsSum, (r) => Number(r.nps_deduction || 0));
}

