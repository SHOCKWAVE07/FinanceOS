"use client";

// ==============================================
// Dashboard Page
// Overview cards and quick stats
// ==============================================

import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  IndianRupee,
  PiggyBank,
  BarChart3,
  Receipt,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercentage, formatRelativeDate } from "@/lib/utils";
import { getDashboardOverview, type DashboardOverview } from "@/app/(dashboard)/dashboard/actions";

export default function DashboardPage() {
  const { data: response, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: () => getDashboardOverview(),
  });

  if (isLoading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Assembling financial metrics...</p>
      </div>
    );
  }

  if (isError || !response || !response.ok) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-3">
        <p className="text-sm text-destructive font-semibold">Failed to load dashboard metrics.</p>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-1.5 border rounded-lg bg-card text-xs text-foreground hover:bg-muted/10"
        >
          <RefreshCw className="h-3 w-3" /> Try Again
        </button>
      </div>
    );
  }

  const overview = response.data as DashboardOverview;

  const stats = [
    {
      title: "Total Balance",
      value: overview.total_balance.value,
      change: overview.total_balance.change,
      icon: Wallet,
      description: "Across bank accounts",
      gradient: "from-blue-500 to-blue-600",
      isCurrency: true,
    },
    {
      title: "Monthly Income",
      value: overview.monthly_income.value,
      change: overview.monthly_income.change,
      icon: TrendingUp,
      description: "This calendar month",
      gradient: "from-emerald-500 to-emerald-600",
      isCurrency: true,
    },
    {
      title: "Monthly Expenses",
      value: overview.monthly_expenses.value,
      change: overview.monthly_expenses.change,
      icon: Receipt,
      description: "This calendar month",
      gradient: "from-red-500 to-red-600",
      isCurrency: true,
    },
    {
      title: "Savings Rate",
      value: overview.savings_rate.value,
      change: overview.savings_rate.change,
      icon: PiggyBank,
      description: "Monthly savings margin",
      gradient: "from-violet-500 to-violet-600",
      isCurrency: false,
      suffix: "%",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Good afternoon! 👋</h2>
          <p className="text-muted-foreground">Here&apos;s your financial overview for today.</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-all hover:bg-muted/10"
          title="Refresh Data"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <div className={`flex size-9 items-center justify-center rounded-lg bg-gradient-to-br ${stat.gradient} text-white shadow-sm`}>
                <stat.icon className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stat.isCurrency
                  ? formatCurrency(stat.value)
                  : `${stat.value.toFixed(1)}${stat.suffix || ""}`}
              </div>
              <div className="flex items-center gap-1 mt-1">
                {stat.change >= 0 ? (
                  <ArrowUpRight className="size-3 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="size-3 text-red-500" />
                )}
                <span className={`text-xs font-medium ${stat.change >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {formatPercentage(stat.change)}
                </span>
                <span className="text-xs text-muted-foreground">vs last month</span>
              </div>
            </CardContent>
            {/* Decorative gradient line at top */}
            <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${stat.gradient}`} />
          </Card>
        ))}
      </div>

      {/* Bottom Section: Activity + Goals */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recent Activity */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>Your latest transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {overview.recent_activity.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-xs text-muted-foreground italic">
                No recent transactions recorded.
              </div>
            ) : (
              <div className="space-y-4">
                {overview.recent_activity.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-lg">
                        {item.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.description}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs px-1.5 py-0">
                            {item.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeDate(item.date)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold tabular-nums ${item.amount >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                      {item.amount >= 0 ? "+" : ""}
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Goals Progress */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Goals Progress</CardTitle>
            <CardDescription>Track your financial goals</CardDescription>
          </CardHeader>
          <CardContent>
            {overview.quick_goals.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-xs text-muted-foreground italic">
                No active savings goals set.
              </div>
            ) : (
              <div className="space-y-6">
                {overview.quick_goals.map((goal) => {
                  const percentage = goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0;
                  return (
                    <div key={goal.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{goal.name}</span>
                        <span className="text-xs text-muted-foreground">{percentage}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${goal.color} transition-all duration-500`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatCurrency(goal.current)}</span>
                        <span>{formatCurrency(goal.target)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-xl bg-blue-500/10">
                <IndianRupee className="size-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net Worth</p>
                <p className="text-xl font-bold">{formatCurrency(overview.net_worth)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-500/10">
                <BarChart3 className="size-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Investments</p>
                <p className="text-xl font-bold">{formatCurrency(overview.investments_value)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-xl bg-violet-500/10">
                <Target className="size-6 text-violet-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Goals Active</p>
                <p className="text-xl font-bold">{overview.quick_goals.length} Goals</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
