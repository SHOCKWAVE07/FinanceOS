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
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";

const CircularProgress = ({ progress, color, icon: Icon }: { progress: number; color: string; icon: any }) => {
  const radius = 18;
  const stroke = 3.5;
  const normalizedRadius = radius - stroke;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(Math.max(progress, 0), 100) / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center size-12 shrink-0">
      <svg className="size-12 transform -rotate-90">
        {/* Background Circle */}
        <circle
          stroke="var(--border)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={24}
          cy={24}
          className="text-border opacity-20"
        />
        {/* Progress Circle */}
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + " " + circumference}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={24}
          cy={24}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {/* Icon in Center */}
      <div className="absolute flex items-center justify-center">
        <Icon className="size-4" style={{ color }} />
      </div>
    </div>
  );
};

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
      progress: overview.net_worth > 0 ? (overview.total_balance.value / overview.net_worth) * 100 : 0,
      ringColor: "#3b82f6",
    },
    {
      title: "Monthly Income",
      value: overview.monthly_income.value,
      change: overview.monthly_income.change,
      icon: TrendingUp,
      description: "This calendar month",
      gradient: "from-emerald-500 to-emerald-600",
      isCurrency: true,
      progress: Math.min((overview.monthly_income.value / 100000) * 100, 100),
      ringColor: "#10b981",
    },
    {
      title: "Monthly Expenses",
      value: overview.monthly_expenses.value,
      change: overview.monthly_expenses.change,
      icon: Receipt,
      description: "This calendar month",
      gradient: "from-red-500 to-red-600",
      isCurrency: true,
      progress: overview.monthly_income.value > 0 ? (overview.monthly_expenses.value / overview.monthly_income.value) * 100 : 0,
      ringColor: "#ef4444",
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
      progress: overview.savings_rate.value,
      ringColor: "#8b5cf6",
    },
  ];

  const avgGoalProgress = overview.quick_goals.length > 0
    ? overview.quick_goals.reduce((acc, g) => acc + (g.target > 0 ? (g.current / g.target) * 100 : 0), 0) / overview.quick_goals.length
    : 0;

  const quickStats = [
    {
      title: "Net Worth",
      value: overview.net_worth,
      icon: IndianRupee,
      description: "Total assets valuation",
      progress: 100,
      ringColor: "#06b6d4",
      gradient: "from-cyan-500 to-cyan-600",
      isCurrency: true,
    },
    {
      title: "Investments Value",
      value: overview.investments_value,
      icon: BarChart3,
      description: "Allocation in assets",
      progress: overview.net_worth > 0 ? (overview.investments_value / overview.net_worth) * 100 : 0,
      ringColor: "#eab308",
      gradient: "from-amber-500 to-amber-600",
      isCurrency: true,
    },
    {
      title: "Goals Progress",
      value: overview.quick_goals.length,
      suffix: " Active Goal" + (overview.quick_goals.length !== 1 ? "s" : ""),
      icon: Target,
      description: "Average goal completion",
      progress: avgGoalProgress,
      ringColor: "#ec4899",
      gradient: "from-pink-500 to-pink-600",
      isCurrency: false,
    }
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
              <CircularProgress progress={stat.progress} color={stat.ringColor} icon={stat.icon} />
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

      {/* Charts Section */}
      <DashboardCharts
        expenseBifurcation={overview.expense_bifurcation}
        salarySplit={overview.salary_split}
      />

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
              <div className="space-y-4">
                {overview.quick_goals.map((goal) => {
                  const percentage = goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0;
                  const colorMap: Record<string, string> = {
                    "bg-blue-500": "#3b82f6",
                    "bg-emerald-500": "#10b981",
                    "bg-red-500": "#ef4444",
                    "bg-rose-500": "#f43f5e",
                    "bg-violet-500": "#8b5cf6",
                    "bg-amber-500": "#f59e0b",
                    "bg-pink-500": "#ec4899",
                  };
                  const hexColor = colorMap[goal.color] || "#3b82f6";
                  const radius = 14;
                  const stroke = 2.5;
                  const circumference = radius * 2 * Math.PI;
                  const strokeDashoffset = circumference - (Math.min(percentage, 100) / 100) * circumference;

                  return (
                    <div key={goal.id} className="flex items-center justify-between p-2 rounded-xl border border-border/40 hover:bg-muted/30 transition-colors">
                      <div className="space-y-1">
                        <span className="text-sm font-semibold text-foreground">{goal.name}</span>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span>{formatCurrency(goal.current)}</span>
                          <span>/</span>
                          <span>{formatCurrency(goal.target)}</span>
                        </div>
                      </div>
                      
                      <div className="relative flex items-center justify-center size-12 shrink-0">
                        <svg className="size-12 transform -rotate-90">
                          <circle
                            stroke="var(--border)"
                            fill="transparent"
                            strokeWidth={stroke}
                            r={radius}
                            cx={24}
                            cy={24}
                            className="opacity-20 text-border"
                          />
                          <circle
                            stroke={hexColor}
                            fill="transparent"
                            strokeWidth={stroke}
                            strokeDasharray={circumference + " " + circumference}
                            style={{ strokeDashoffset }}
                            strokeLinecap="round"
                            r={radius}
                            cx={24}
                            cy={24}
                            className="transition-all duration-500"
                          />
                        </svg>
                        <span className="absolute text-[9px] font-bold font-mono" style={{ color: hexColor }}>
                          {percentage}%
                        </span>
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
        {quickStats.map((stat) => (
          <Card key={stat.title} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <CircularProgress progress={stat.progress} color={stat.ringColor} icon={stat.icon} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stat.isCurrency
                  ? formatCurrency(stat.value)
                  : `${stat.value}${stat.suffix || ""}`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description} ({stat.progress.toFixed(0)}% {stat.title === "Net Worth" ? "total" : stat.title === "Investments Value" ? "of net worth" : "avg progress"})
              </p>
            </CardContent>
            {/* Decorative gradient line at top */}
            <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${stat.gradient}`} />
          </Card>
        ))}
      </div>
    </div>
  );
}
