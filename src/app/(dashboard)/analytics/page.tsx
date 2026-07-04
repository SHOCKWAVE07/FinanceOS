"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  BarChart3,
  Percent,
  TrendingUpIcon,
  PieChartIcon,
  DollarSign,
  ChevronDown,
  Calendar,
  Layers,
  ArrowUpRight,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  getMonthlyCashFlowData,
  getCategorySpendingData,
  getAssetAllocationData,
  getNetWorthSummary,
  type MonthlyCashFlowData,
  type CategorySpendingData,
  type AssetAllocationData,
} from "@/app/(dashboard)/analytics/actions";
import { formatCurrency, formatCompactCurrency, formatPercentage } from "@/lib/utils";

// Curated dark theme palette
const COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#a855f7", // Purple
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#84cc16", // Lime
  "#14b8a6", // Teal
  "#f97316", // Orange
];

const ASSET_TYPE_LABELS: Record<string, string> = {
  mutual_fund: "Mutual Funds",
  stock: "Stocks",
  crypto: "Crypto",
  gold: "Gold",
  fixed_deposit: "Fixed Deposits",
  ppf: "PPF",
  nps: "NPS",
  real_estate: "Real Estate",
  other: "Other Assets",
};

const CustomTooltip = ({ active, payload, label, isCurrency = true }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border/80 bg-card/95 p-3 shadow-xl backdrop-blur-md">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
        <div className="space-y-1">
          {payload.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center gap-4 justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
                {item.name}:
              </span>
              <span className="font-semibold text-foreground">
                {isCurrency ? formatCurrency(item.value) : `${Number(item.value).toFixed(1)}%`}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const [rangeMonths, setRangeMonths] = React.useState<number>(12);

  // Queries
  const { data: cashFlowRes, isLoading: cashFlowLoading, refetch: refetchCashFlow } = useQuery({
    queryKey: ["analytics-cashflow"],
    queryFn: () => getMonthlyCashFlowData(),
  });

  const { data: categorySpendingRes, isLoading: categoryLoading, refetch: refetchCategory } = useQuery({
    queryKey: ["analytics-category"],
    queryFn: () => getCategorySpendingData(),
  });

  const { data: assetAllocationRes, isLoading: assetLoading, refetch: refetchAsset } = useQuery({
    queryKey: ["analytics-assets"],
    queryFn: () => getAssetAllocationData(),
  });

  const { data: netWorthRes, isLoading: netWorthLoading, refetch: refetchNetWorth } = useQuery({
    queryKey: ["analytics-networth"],
    queryFn: () => getNetWorthSummary(),
  });

  const handleRefresh = () => {
    refetchCashFlow();
    refetchCategory();
    refetchAsset();
    refetchNetWorth();
  };

  const cashFlowData = cashFlowRes?.ok ? cashFlowRes.data : [];
  const categoryData = categorySpendingRes?.ok ? categorySpendingRes.data : [];
  const assetData = assetAllocationRes?.ok ? assetAllocationRes.data : [];
  const netWorth = netWorthRes?.ok
    ? netWorthRes.data
    : { total_cash: 0, total_investments: 0, net_worth: 0 };

  // Filter cash flow to match selected range
  const filteredCashFlow = React.useMemo(() => {
    if (!cashFlowData) return [];
    return cashFlowData.slice(-rangeMonths);
  }, [cashFlowData, rangeMonths]);

  const totalSpent = React.useMemo(() => {
    return categoryData.reduce((acc, cur) => acc + cur.total_amount, 0);
  }, [categoryData]);

  // Average Savings Rate across range
  const avgSavingsRate = React.useMemo(() => {
    if (filteredCashFlow.length === 0) return 0;
    const totalInc = filteredCashFlow.reduce((acc, cur) => acc + cur.total_income, 0);
    const totalExp = filteredCashFlow.reduce((acc, cur) => acc + cur.total_expense, 0);
    return totalInc > 0 ? ((totalInc - totalExp) / totalInc) * 100 : 0;
  }, [filteredCashFlow]);

  const isLoading = cashFlowLoading || categoryLoading || assetLoading || netWorthLoading;

  if (isLoading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Computing portfolios and allocations…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Welcome Panel */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Financial Analytics</h2>
          <p className="text-sm text-muted-foreground">
            A comprehensive, visual look into your spending patterns, savings rate, and asset allocation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={rangeMonths}
            onChange={(e) => setRangeMonths(Number(e.target.value))}
            className="h-9 rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium"
          >
            <option value={3}>Last 3 Months</option>
            <option value={6}>Last 6 Months</option>
            <option value={12}>Last 12 Months</option>
            <option value={24}>Last 24 Months</option>
          </select>
          <button
            onClick={handleRefresh}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-all hover:bg-muted/10"
            title="Refresh Data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Net Worth */}
        <Card className="relative overflow-hidden bg-card/60 backdrop-blur-sm border-border/60 shadow-sm transition-all duration-300 hover:scale-[1.01]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Net Worth</CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <Wallet className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{formatCurrency(netWorth.net_worth)}</div>
            <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
              <span>Cash + Investments</span>
            </div>
          </CardContent>
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 to-blue-600" />
        </Card>

        {/* Liquid Cash */}
        <Card className="relative overflow-hidden bg-card/60 backdrop-blur-sm border-border/60 shadow-sm transition-all duration-300 hover:scale-[1.01]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Liquid Cash</CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <PiggyBank className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{formatCurrency(netWorth.total_cash)}</div>
            <div className="text-[10px] text-muted-foreground mt-1">Across all active accounts</div>
          </CardContent>
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 to-emerald-600" />
        </Card>

        {/* Total Assets */}
        <Card className="relative overflow-hidden bg-card/60 backdrop-blur-sm border-border/60 shadow-sm transition-all duration-300 hover:scale-[1.01]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Investments</CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500 border border-violet-500/20">
              <BarChart3 className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{formatCurrency(netWorth.total_investments)}</div>
            <div className="text-[10px] text-muted-foreground mt-1">Total current asset valuation</div>
          </CardContent>
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500 to-violet-600" />
        </Card>

        {/* Average Savings Rate */}
        <Card className="relative overflow-hidden bg-card/60 backdrop-blur-sm border-border/60 shadow-sm transition-all duration-300 hover:scale-[1.01]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Savings Rate</CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Percent className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{avgSavingsRate.toFixed(1)}%</div>
            <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              <span>Avg over last {rangeMonths} months</span>
            </div>
          </CardContent>
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 to-amber-600" />
        </Card>
      </div>

      {/* Main Charts & Visualizations tabs */}
      <Tabs defaultValue="cashflow" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-md bg-muted/60 p-0.5 border border-border/40 mb-6">
          <TabsTrigger value="cashflow" className="text-xs py-1.5 rounded font-semibold transition-all">
            Cash Flow
          </TabsTrigger>
          <TabsTrigger value="categories" className="text-xs py-1.5 rounded font-semibold transition-all">
            Categories
          </TabsTrigger>
          <TabsTrigger value="assets" className="text-xs py-1.5 rounded font-semibold transition-all">
            Allocations
          </TabsTrigger>
          <TabsTrigger value="savings" className="text-xs py-1.5 rounded font-semibold transition-all">
            Savings
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Cash Flow Line Chart */}
        <TabsContent value="cashflow" className="space-y-6 focus:outline-none">
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-base font-bold">Income vs. Expense Trend</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Comparing monthly credits and debits to understand net savings patterns.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="h-[380px] w-full pt-4">
              {filteredCashFlow.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground italic">
                  No transaction data available for this range.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredCashFlow} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => {
                        const date = new Date(val);
                        return date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
                      }}
                      tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "monospace" }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => formatCompactCurrency(val)}
                      tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "monospace" }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 11, color: "#e2e8f0" }}
                    />
                    <Bar name="Income" dataKey="total_income" fill="url(#incomeGrad)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    <Bar name="Expense" dataKey="total_expense" fill="url(#expenseGrad)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Category Breakdown */}
        <TabsContent value="categories" className="grid gap-6 md:grid-cols-5 focus:outline-none">
          <Card className="md:col-span-3 bg-card/50 backdrop-blur-sm border-border flex flex-col">
            <CardHeader>
              <CardTitle className="text-base font-bold">Category Distribution</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Proportion of expenses allocated across individual categories.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex-1">
              {categoryData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground italic">
                  No categorical expense data found.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      nameKey="category_name"
                      dataKey="total_amount"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                    >
                      {categoryData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.category_color || COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Category List */}
          <Card className="md:col-span-2 bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="text-base font-bold">Spending by Category</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Itemized breakdown sorted by spending.
              </CardDescription>
            </CardHeader>
            <CardContent className="max-h-[300px] overflow-y-auto pr-1">
              {categoryData.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No spending logs found.</p>
              ) : (
                <div className="space-y-3">
                  {categoryData.map((item, idx) => {
                    const percentage = totalSpent > 0 ? (item.total_amount / totalSpent) * 100 : 0;
                    const catColor = item.category_color || COLORS[idx % COLORS.length];
                    return (
                      <div key={item.category_name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 font-semibold">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: catColor }} />
                            {item.category_name}
                          </span>
                          <span className="font-mono text-muted-foreground">
                            {formatCurrency(item.total_amount)}
                            <span className="ml-1 text-[10px] text-muted-foreground/60">({percentage.toFixed(0)}%)</span>
                          </span>
                        </div>
                        <div className="h-1 rounded-full bg-muted/60 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: catColor }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Asset Allocations */}
        <TabsContent value="assets" className="grid gap-6 md:grid-cols-5 focus:outline-none">
          <Card className="md:col-span-3 bg-card/50 backdrop-blur-sm border-border flex flex-col">
            <CardHeader>
              <CardTitle className="text-base font-bold">Asset Allocation</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Portfolio diversification across asset classes.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex-1">
              {assetData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground italic">
                  No investments recorded. Add assets in the Investments ledger.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assetData}
                      nameKey="type"
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={3}
                    >
                      {assetData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={
                        <CustomTooltip
                          isCurrency={true}
                          label="Asset Allocations"
                          formatter={(v: string, name: string) => [v, ASSET_TYPE_LABELS[name] || name]}
                        />
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Allocation Details */}
          <Card className="md:col-span-2 bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="text-base font-bold">Portfolio Details</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Gains and returns broken down by type.
              </CardDescription>
            </CardHeader>
            <CardContent className="max-h-[300px] overflow-y-auto pr-1">
              {assetData.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No portfolio data found.</p>
              ) : (
                <div className="space-y-3.5">
                  {assetData.map((item, idx) => {
                    const label = ASSET_TYPE_LABELS[item.type] || item.type;
                    const isPositive = item.gain >= 0;
                    return (
                      <div key={item.type} className="flex items-center justify-between text-xs border-b border-border/40 pb-2 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <div>
                            <p className="font-semibold text-foreground">{label}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">Invested: {formatCurrency(item.invested)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-foreground">{formatCurrency(item.value)}</p>
                          <p className={`text-[10px] font-semibold flex items-center justify-end gap-0.5 ${isPositive ? "text-emerald-500" : "text-red-500"}`}>
                            {isPositive ? "+" : ""}{item.gain_percentage.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Savings Rate Area Chart */}
        <TabsContent value="savings" className="space-y-6 focus:outline-none">
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="text-base font-bold">Monthly Savings Rate</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Percentage of monthly income saved after all expenditures. 
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[360px] w-full pt-4">
              {filteredCashFlow.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground italic">
                  No historical cash flows available.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={filteredCashFlow} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => {
                        const date = new Date(val);
                        return date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
                      }}
                      tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "monospace" }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `${val}%`}
                      tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "monospace" }}
                    />
                    <Tooltip content={<CustomTooltip isCurrency={false} />} />
                    <Area
                      name="Savings Rate"
                      type="monotone"
                      dataKey="savings_rate"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#savingsGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
