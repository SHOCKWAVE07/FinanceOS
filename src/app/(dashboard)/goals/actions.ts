"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/app/(dashboard)/investments/actions"; // reuse requireAuth
import {
  goalFormSchema,
  GoalFormValues,
  milestoneFormSchema,
  MilestoneFormValues,
} from "@/lib/validations/goal.schemas";
import { ActionResult } from "@/types";
import { Goal, Milestone, Investment } from "@/types/database";

export interface GoalWithStats extends Goal {
  total_saved: number;
  progress_percentage: number;
  linked_investments_count: number;
  milestones_count: number;
  completed_milestones_count: number;
  milestones: Milestone[];
  linked_investments: Array<{
    id: string;
    name: string;
    type: string;
    institution: string;
    current_value: number;
    allocated_share: number;
    allocated_value: number;
  }>;
}

export async function getGoals(): Promise<ActionResult<GoalWithStats[]>> {
  try {
    const { supabase, userId } = await requireAuth();

    // 1. Fetch all goals
    const { data: goals, error: goalsErr } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", userId)
      .order("target_date", { ascending: true });

    if (goalsErr) throw goalsErr;

    const result: GoalWithStats[] = [];

    for (const goal of goals) {
      // 2. Fetch milestones
      const { data: milestones, error: milErr } = await supabase
        .from("milestones")
        .select("*")
        .eq("goal_id", goal.id)
        .order("created_at", { ascending: true });

      if (milErr) throw milErr;

      // 3. Fetch linked investments
      const { data: links, error: linkErr } = await supabase
        .from("goal_investments")
        .select(`
          allocated_share,
          investments (
            id,
            name,
            type,
            institution,
            current_value
          )
        `)
        .eq("goal_id", goal.id);

      if (linkErr) throw linkErr;

      const linkedInvestments = (links || []).map((link: any) => {
        const inv = link.investments;
        const currentVal = Number(inv?.current_value || 0);
        const share = Number(link.allocated_share || 0);
        return {
          id: inv?.id,
          name: inv?.name || "Unknown Asset",
          type: inv?.type || "other",
          institution: inv?.institution || "",
          current_value: currentVal,
          allocated_share: share,
          allocated_value: (currentVal * share) / 100,
        };
      });

      // Calculate total saved
      const manualSavings = Number(goal.manual_savings || 0);
      const investmentsVal = linkedInvestments.reduce((sum, item) => sum + item.allocated_value, 0);
      const totalSaved = manualSavings + investmentsVal;

      // Calculate progress percentage
      const targetAmount = Number(goal.target_amount);
      const progressPercentage = targetAmount > 0 ? Math.min(100, (totalSaved / targetAmount) * 100) : 0;

      const milestonesList = milestones || [];
      const completedMilestones = milestonesList.filter((m) => m.is_completed).length;

      result.push({
        ...goal,
        total_saved: totalSaved,
        progress_percentage: progressPercentage,
        linked_investments_count: linkedInvestments.length,
        milestones_count: milestonesList.length,
        completed_milestones_count: completedMilestones,
        milestones: milestonesList,
        linked_investments: linkedInvestments,
      });
    }

    return { ok: true, data: result };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function createGoal(
  raw: GoalFormValues
): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase, userId } = await requireAuth();
    const parsed = goalFormSchema.parse(raw);

    // 1. Create Goal
    const { data: newGoal, error: goalErr } = await supabase
      .from("goals")
      .insert({
        user_id: userId,
        name: parsed.name,
        description: parsed.description,
        target_amount: parsed.target_amount,
        target_date: parsed.target_date,
        category: parsed.category,
        status: parsed.status,
        priority: parsed.priority,
        manual_savings: parsed.manual_savings,
      })
      .select("id")
      .single();

    if (goalErr) throw goalErr;

    // 2. Link Investments if any
    if (parsed.linkedInvestments && parsed.linkedInvestments.length > 0) {
      const linksInsert = parsed.linkedInvestments.map((link) => ({
        goal_id: newGoal.id,
        investment_id: link.investmentId,
        allocated_share: link.allocatedShare,
      }));

      const { error: linkErr } = await supabase
        .from("goal_investments")
        .insert(linksInsert);

      if (linkErr) {
        // cleanup goal
        await supabase.from("goals").delete().eq("id", newGoal.id);
        throw linkErr;
      }
    }

    revalidatePath("/goals");
    revalidatePath("/dashboard");
    return { ok: true, data: { id: newGoal.id } };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function updateGoal(
  id: string,
  raw: GoalFormValues
): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireAuth();
    const parsed = goalFormSchema.parse(raw);

    // 1. Update Goal
    const { error: goalErr } = await supabase
      .from("goals")
      .update({
        name: parsed.name,
        description: parsed.description,
        target_amount: parsed.target_amount,
        target_date: parsed.target_date,
        category: parsed.category,
        status: parsed.status,
        priority: parsed.priority,
        manual_savings: parsed.manual_savings,
      })
      .eq("id", id)
      .eq("user_id", userId);

    if (goalErr) throw goalErr;

    // 2. Refresh linked investments
    // Delete existing links
    const { error: delErr } = await supabase
      .from("goal_investments")
      .delete()
      .eq("goal_id", id);

    if (delErr) throw delErr;

    // Insert new links
    if (parsed.linkedInvestments && parsed.linkedInvestments.length > 0) {
      const linksInsert = parsed.linkedInvestments.map((link) => ({
        goal_id: id,
        investment_id: link.investmentId,
        allocated_share: link.allocatedShare,
      }));

      const { error: linkErr } = await supabase
        .from("goal_investments")
        .insert(linksInsert);

      if (linkErr) throw linkErr;
    }

    revalidatePath("/goals");
    revalidatePath("/dashboard");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function deleteGoal(id: string): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireAuth();

    const { error } = await supabase
      .from("goals")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;

    revalidatePath("/goals");
    revalidatePath("/dashboard");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ── Milestone Actions ──────────────────────────────

export async function createMilestone(
  goalId: string,
  raw: MilestoneFormValues
): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase } = await requireAuth();
    const parsed = milestoneFormSchema.parse(raw);

    const { data, error } = await supabase
      .from("milestones")
      .insert({
        goal_id: goalId,
        name: parsed.name,
        target_amount: parsed.target_amount,
        target_date: parsed.target_date,
        is_completed: parsed.is_completed,
        completed_at: parsed.is_completed ? new Date().toISOString() : null,
      })
      .select("id")
      .single();

    if (error) throw error;

    revalidatePath("/goals");
    return { ok: true, data: { id: data.id } };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function updateMilestone(
  milestoneId: string,
  raw: MilestoneFormValues
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAuth();
    const parsed = milestoneFormSchema.parse(raw);

    // Fetch existing milestone to check completion transition
    const { data: existing, error: fetchErr } = await supabase
      .from("milestones")
      .select("is_completed, completed_at")
      .eq("id", milestoneId)
      .single();

    if (fetchErr) throw fetchErr;

    let completedAt = existing.completed_at;
    if (parsed.is_completed && !existing.is_completed) {
      completedAt = new Date().toISOString();
    } else if (!parsed.is_completed) {
      completedAt = null;
    }

    const { error } = await supabase
      .from("milestones")
      .update({
        name: parsed.name,
        target_amount: parsed.target_amount,
        target_date: parsed.target_date,
        is_completed: parsed.is_completed,
        completed_at: completedAt,
      })
      .eq("id", milestoneId);

    if (error) throw error;

    revalidatePath("/goals");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function deleteMilestone(milestoneId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAuth();

    const { error } = await supabase
      .from("milestones")
      .delete()
      .eq("id", milestoneId);

    if (error) throw error;

    revalidatePath("/goals");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function toggleMilestone(
  milestoneId: string,
  isCompleted: boolean
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAuth();

    const { error } = await supabase
      .from("milestones")
      .update({
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
      })
      .eq("id", milestoneId);

    if (error) throw error;

    revalidatePath("/goals");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ── Goal Analytics Stats ───────────────────────────

export interface GoalStats {
  totalGoalsCount: number;
  completedGoalsCount: number;
  activeGoalsCount: number;
  totalTargetAmount: number;
  totalSavedAmount: number;
  overallProgressPercent: number;
  categoryDistribution: Array<{
    category: string;
    count: number;
    target: number;
    saved: number;
  }>;
  upcomingMilestones: Array<{
    goalId: string;
    goalName: string;
    milestoneId: string;
    milestoneName: string;
    targetDate: string;
  }>;
}

export async function getGoalStats(): Promise<ActionResult<GoalStats>> {
  try {
    const result = await getGoals();
    if (!result.ok) throw new Error(result.error);
    const goals = result.data;

    const totalGoalsCount = goals.length;
    const completedGoalsCount = goals.filter((g) => g.status === "completed").length;
    const activeGoalsCount = goals.filter((g) => g.status === "active").length;

    const totalTargetAmount = goals.reduce((sum, g) => sum + Number(g.target_amount), 0);
    const totalSavedAmount = goals.reduce((sum, g) => sum + g.total_saved, 0);

    const overallProgressPercent =
      totalTargetAmount > 0 ? Math.min(100, (totalSavedAmount / totalTargetAmount) * 100) : 0;

    // Category distribution
    const catMap: Record<string, { count: number; target: number; saved: number }> = {};
    for (const g of goals) {
      if (!catMap[g.category]) {
        catMap[g.category] = { count: 0, target: 0, saved: 0 };
      }
      catMap[g.category].count += 1;
      catMap[g.category].target += Number(g.target_amount);
      catMap[g.category].saved += g.total_saved;
    }

    const categoryDistribution = Object.entries(catMap).map(([category, info]) => ({
      category,
      count: info.count,
      target: info.target,
      saved: info.saved,
    }));

    // Upcoming milestones
    const upcomingMilestones: GoalStats["upcomingMilestones"] = [];
    for (const g of goals) {
      for (const m of g.milestones) {
        if (!m.is_completed && m.target_date) {
          upcomingMilestones.push({
            goalId: g.id,
            goalName: g.name,
            milestoneId: m.id,
            milestoneName: m.name,
            targetDate: m.target_date,
          });
        }
      }
    }

    // Sort upcoming milestones by target date ascending
    upcomingMilestones.sort(
      (a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
    );

    return {
      ok: true,
      data: {
        totalGoalsCount,
        completedGoalsCount,
        activeGoalsCount,
        totalTargetAmount,
        totalSavedAmount,
        overallProgressPercent,
        categoryDistribution,
        upcomingMilestones: upcomingMilestones.slice(0, 5), // return top 5
      },
    };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
