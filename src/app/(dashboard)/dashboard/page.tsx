"use client";

// ==============================================
// Dashboard Page
// Overview cards and quick stats
// ==============================================

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
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercentage } from "@/lib/utils";

// Placeholder data — will be replaced with real queries in Phase 2+
const stats = [
  {
    title: "Total Balance",
    value: 847500,
    change: 12.5,
    icon: Wallet,
    description: "Across all accounts",
    gradient: "from-blue-500 to-blue-600",
  },
  {
    title: "Monthly Income",
    value: 125000,
    change: 8.2,
    icon: TrendingUp,
    description: "This month",
    gradient: "from-emerald-500 to-emerald-600",
  },
  {
    title: "Monthly Expenses",
    value: 45200,
    change: -3.1,
    icon: Receipt,
    description: "This month",
    gradient: "from-red-500 to-red-600",
  },
  {
    title: "Savings Rate",
    value: 63.8,
    change: 5.4,
    icon: PiggyBank,
    description: "This month",
    gradient: "from-violet-500 to-violet-600",
    isCurrency: false,
    suffix: "%",
  },
];

const recentActivity = [
  {
    id: 1,
    description: "Grocery Shopping",
    amount: -2450,
    category: "Groceries",
    date: "Today",
    icon: "🛒",
  },
  {
    id: 2,
    description: "Salary Credit",
    amount: 125000,
    category: "Salary",
    date: "Yesterday",
    icon: "💰",
  },
  {
    id: 3,
    description: "Netflix Subscription",
    amount: -649,
    category: "Subscriptions",
    date: "2 days ago",
    icon: "📱",
  },
  {
    id: 4,
    description: "Freelance Payment",
    amount: 15000,
    category: "Freelance",
    date: "3 days ago",
    icon: "💻",
  },
  {
    id: 5,
    description: "Electricity Bill",
    amount: -1800,
    category: "Bills",
    date: "4 days ago",
    icon: "💡",
  },
];

const quickGoals = [
  {
    name: "Emergency Fund",
    current: 300000,
    target: 500000,
    color: "bg-blue-500",
  },
  {
    name: "Vacation",
    current: 45000,
    target: 100000,
    color: "bg-violet-500",
  },
  {
    name: "New Laptop",
    current: 65000,
    target: 80000,
    color: "bg-emerald-500",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Good afternoon! 👋
        </h2>
        <p className="text-muted-foreground">
          Here&apos;s your financial overview for today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div
                className={`flex size-9 items-center justify-center rounded-lg bg-gradient-to-br ${stat.gradient} text-white shadow-sm`}
              >
                <stat.icon className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stat.isCurrency === false
                  ? `${stat.value}${stat.suffix || ""}`
                  : formatCurrency(stat.value)}
              </div>
              <div className="flex items-center gap-1 mt-1">
                {stat.change >= 0 ? (
                  <ArrowUpRight className="size-3 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="size-3 text-red-500" />
                )}
                <span
                  className={`text-xs font-medium ${
                    stat.change >= 0 ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {formatPercentage(stat.change)}
                </span>
                <span className="text-xs text-muted-foreground">
                  vs last month
                </span>
              </div>
            </CardContent>
            {/* Decorative gradient line at top */}
            <div
              className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${stat.gradient}`}
            />
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
            <div className="space-y-4">
              {recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-muted/50"
                >
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
                          {item.date}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      item.amount >= 0 ? "text-emerald-500" : "text-red-500"
                    }`}
                  >
                    {item.amount >= 0 ? "+" : ""}
                    {formatCurrency(Math.abs(item.amount))}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Goals Progress */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Goals Progress</CardTitle>
            <CardDescription>Track your financial goals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {quickGoals.map((goal) => {
                const percentage = Math.round(
                  (goal.current / goal.target) * 100
                );
                return (
                  <div key={goal.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{goal.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {percentage}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${goal.color} transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
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
                <p className="text-xl font-bold">{formatCurrency(2450000)}</p>
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
                <p className="text-xl font-bold">{formatCurrency(1200000)}</p>
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
                <p className="text-xl font-bold">5 Goals</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
