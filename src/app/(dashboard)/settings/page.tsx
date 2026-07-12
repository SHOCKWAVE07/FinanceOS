"use client";

// ==============================================
// Settings Page
// Profile & app configuration
// ==============================================

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, User, Palette, Globe, Shield, Wallet, Plus, Trash2, Edit, X, Folder } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { profileSchema, type ProfileFormValues } from "@/lib/validations/schemas";
import { APP_VERSION } from "@/lib/constants";
import { setDefaultAccount } from "@/app/(dashboard)/expenses/actions";
import type { Account, Category } from "@/types/database";

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [defaultAccountId, setDefaultAccountId] = useState<string>("");
  const [loadingAccounts, setLoadingAccounts] = useState<boolean>(true);

  // Category Manager State
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState<boolean>(true);
  const [categoryTypeFilter, setCategoryTypeFilter] = useState<"expense" | "income" | "investment">("expense");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [catName, setCatName] = useState("");
  const [catIcon, setCatIcon] = useState("📁");
  const [catColor, setCatColor] = useState("#3b82f6");
  const [catIsActive, setCatIsActive] = useState(true);
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);

  const PRESET_COLORS = [
    "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
    "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#64748b"
  ];

  const fetchCategories = async () => {
    if (!user) return;
    const supabase = createClient() as any;
    const { data } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .order("name", { ascending: true });
    if (data) {
      setCategories(data);
    }
    setLoadingCategories(false);
  };

  useEffect(() => {
    if (user) {
      fetchCategories();
    }
  }, [user]);

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !catName.trim()) return;

    setIsSubmittingCategory(true);
    const supabase = createClient() as any;
    const slug = catName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from("categories")
          .update({
            name: catName.trim(),
            slug,
            icon: catIcon,
            color: catColor,
            is_active: catIsActive,
          })
          .eq("id", editingCategory.id)
          .eq("user_id", user.id);

        if (error) throw error;
        toast.success("Category updated successfully!");
      } else {
        const { error } = await supabase
          .from("categories")
          .insert({
            user_id: user.id,
            name: catName.trim(),
            slug,
            type: categoryTypeFilter,
            icon: catIcon,
            color: catColor,
            is_active: true,
          });

        if (error) throw error;
        toast.success("Category created successfully!");
      }

      setCatName("");
      setCatIcon("📁");
      setCatColor("#3b82f6");
      setEditingCategory(null);
      await fetchCategories();
    } catch (err: any) {
      toast.error(err.message || "Failed to save category.");
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const handleStartEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatIcon(cat.icon || "📁");
    setCatColor(cat.color || "#3b82f6");
    setCatIsActive(cat.is_active);
  };

  const handleCancelEditCategory = () => {
    setEditingCategory(null);
    setCatName("");
    setCatIcon("📁");
    setCatColor("#3b82f6");
    setCatIsActive(true);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!user) return;
    const supabase = createClient() as any;
    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("Category deleted successfully!");
      await fetchCategories();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete category.");
    }
  };

  useEffect(() => {
    if (user) {
      const supabase = createClient();
      supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("name", { ascending: true })
        .then(({ data, error }) => {
          if (!error && data) {
            setAccounts(data);
            const currentDefault = data.find((a) => (a as any).is_default);
            if (currentDefault) {
              setDefaultAccountId((currentDefault as any).id);
            }
          }
          setLoadingAccounts(false);
        });
    }
  }, [user]);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name ?? "",
      currency: profile?.currency ?? "INR",
      locale: profile?.locale ?? "en-IN",
      timezone: profile?.timezone ?? "Asia/Kolkata",
      theme: (profile?.theme as "light" | "dark" | "system") ?? "system",
    },
  });

  const onSubmit = async (data: ProfileFormValues) => {
    setIsSaving(true);
    setMessage(null);

    try {
      const supabase = createClient() as any;
      const { error } = await supabase
        .from("profiles")
        .update(data)
        .eq("id", user!.id);

      if (error) throw error;

      setTheme(data.theme);
      await refreshProfile();
      setMessage({ type: "success", text: "Settings saved successfully!" });
    } catch {
      setMessage({ type: "error", text: "Failed to save settings." });
    } finally {
      setIsSaving(false);
    }
  };

  const themes = [
    { value: "light", label: "Light", icon: "☀️" },
    { value: "dark", label: "Dark", icon: "🌙" },
    { value: "system", label: "System", icon: "💻" },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Message */}
        {message && (
          <div
            className={`rounded-lg p-3 text-sm ${
              message.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                : "bg-destructive/10 border border-destructive/20 text-destructive"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Profile */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="size-5 text-blue-500" />
              <CardTitle className="text-lg">Profile</CardTitle>
            </div>
            <CardDescription>Your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                {...register("full_name")}
                className={errors.full_name ? "border-destructive" : ""}
              />
              {errors.full_name && (
                <p className="text-xs text-destructive">
                  {errors.full_name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email ?? ""} disabled className="opacity-60" />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed here
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="size-5 text-violet-500" />
              <CardTitle className="text-lg">Appearance</CardTitle>
            </div>
            <CardDescription>Customize the look and feel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Theme</Label>
              <div className="grid grid-cols-3 gap-3">
                {themes.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => {
                      setTheme(t.value);
                    }}
                    className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition-all hover:border-primary/50 ${
                      theme === t.value
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border"
                    }`}
                  >
                    <span className="text-2xl">{t.icon}</span>
                    <span className="text-sm font-medium">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Locale */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="size-5 text-emerald-500" />
              <CardTitle className="text-lg">Regional</CardTitle>
            </div>
            <CardDescription>Currency and locale preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input id="currency" {...register("currency")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input id="timezone" {...register("timezone")} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Default Account */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wallet className="size-5 text-indigo-500" />
              <CardTitle className="text-lg">Default Account</CardTitle>
            </div>
            <CardDescription>
              Select the primary bank or savings account to automatically route salary, unlinked income, investments, and expenses.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="default_account">Primary Debit/Savings Account</Label>
              {loadingAccounts ? (
                <div className="h-10 w-full rounded-lg border border-border bg-card/50 px-3 py-2 text-sm text-muted-foreground animate-pulse flex items-center">
                  Loading accounts...
                </div>
              ) : accounts.length > 0 ? (
                <Select
                  value={defaultAccountId || undefined}
                  onValueChange={async (value) => {
                    setDefaultAccountId(value || "");
                    const res = await setDefaultAccount(value || "");
                    if (res.ok) {
                      toast.success("Default account updated successfully!");
                    } else {
                      toast.error(res.error || "Failed to update default account");
                    }
                  }}
                >
                  <SelectTrigger id="default_account" className="w-full">
                    <SelectValue placeholder="Select default account">
                      {defaultAccountId ? accounts.find((acc) => acc.id === defaultAccountId)?.name : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-sm text-muted-foreground p-3 border border-dashed rounded-lg bg-muted/20">
                  No active accounts found. Create an account to set a default.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSaving}
            className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white shadow-lg shadow-blue-500/25"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 size-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Category Manager Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Folder className="size-5 text-indigo-500" />
            <CardTitle className="text-lg">Manage Categories</CardTitle>
          </div>
          <CardDescription>
            Create, update, and manage categories for your income, expenses, and investments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Category Type Filter Tabs */}
          <div className="flex gap-2 p-1 rounded-lg bg-muted max-w-md">
            <button
              type="button"
              onClick={() => {
                setCategoryTypeFilter("expense");
                handleCancelEditCategory();
              }}
              className={`flex-1 text-xs py-1.5 font-medium rounded-md transition-all ${
                categoryTypeFilter === "expense"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Expense Categories
            </button>
            <button
              type="button"
              onClick={() => {
                setCategoryTypeFilter("income");
                handleCancelEditCategory();
              }}
              className={`flex-1 text-xs py-1.5 font-medium rounded-md transition-all ${
                categoryTypeFilter === "income"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Income Categories
            </button>
            <button
              type="button"
              onClick={() => {
                setCategoryTypeFilter("investment");
                handleCancelEditCategory();
              }}
              className={`flex-1 text-xs py-1.5 font-medium rounded-md transition-all ${
                categoryTypeFilter === "investment"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Investment Categories
            </button>
          </div>

          {/* Category Create/Edit Form */}
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {editingCategory 
                ? "Edit Category" 
                : `Add New ${categoryTypeFilter === "expense" ? "Expense" : categoryTypeFilter === "income" ? "Income" : "Investment"} Category`}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2 col-span-1">
                <Label htmlFor="cat_name">Category Name</Label>
                <Input
                  id="cat_name"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Rent, Dining out..."
                  className="h-8"
                />
              </div>
              <div className="space-y-2 col-span-1">
                <Label htmlFor="cat_icon">Emoji Icon</Label>
                <Input
                  id="cat_icon"
                  value={catIcon}
                  onChange={(e) => setCatIcon(e.target.value)}
                  placeholder="e.g. 🍔, 🏠, 📈"
                  className="h-8 text-center text-lg"
                />
              </div>
              <div className="space-y-2 col-span-1 flex flex-col justify-end">
                <Label className="mb-2 text-xs">Color</Label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCatColor(color)}
                      className={`size-5 rounded-full border transition-all ${
                        catColor === color ? "border-foreground ring-2 ring-ring scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <input
                    type="color"
                    value={catColor}
                    onChange={(e) => setCatColor(e.target.value)}
                    className="size-5 rounded-full cursor-pointer border border-border p-0 overflow-hidden"
                  />
                </div>
              </div>
            </div>

            {editingCategory && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="cat_active"
                  checked={catIsActive}
                  onChange={(e) => setCatIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <Label htmlFor="cat_active" className="cursor-pointer text-xs font-semibold">Active Category</Label>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              {editingCategory && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEditCategory}
                  disabled={isSubmittingCategory}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                onClick={handleSaveCategory}
                disabled={isSubmittingCategory || !catName.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isSubmittingCategory && <Loader2 className="mr-1.5 size-3 animate-spin" />}
                {editingCategory ? "Update Category" : "Add Category"}
              </Button>
            </div>
          </div>

          {/* Categories List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Existing Categories</h4>
            {loadingCategories ? (
              <div className="h-20 w-full animate-pulse bg-muted/40 rounded-xl flex items-center justify-center text-xs text-muted-foreground">
                Loading categories...
              </div>
            ) : categories.filter((c) => c.type === categoryTypeFilter).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {categories
                  .filter((c) => c.type === categoryTypeFilter)
                  .map((cat) => (
                    <div
                      key={cat.id}
                      className={`flex items-center justify-between p-3 rounded-xl border border-border bg-card/50 transition-all ${
                        !cat.is_active ? "opacity-60" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{cat.icon}</span>
                        <div>
                          <p className="text-sm font-semibold flex items-center gap-1.5">
                            {cat.name}
                            <span className="size-2 rounded-full" style={{ backgroundColor: cat.color || "#ccc" }} />
                          </p>
                          {!cat.is_active && (
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Inactive</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStartEditCategory(cat)}
                          className="size-8 text-muted-foreground hover:text-foreground"
                        >
                          <Edit className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="size-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-xl">
                No custom categories found for {categoryTypeFilter}.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* App Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="size-5 text-amber-500" />
            <CardTitle className="text-lg">About</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Version</span>
            <Badge variant="secondary">{APP_VERSION}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
