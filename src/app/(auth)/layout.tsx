// ==============================================
// Auth Layout
// Shared layout for login/register pages
// ==============================================

import { IndianRupee } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Left: Branding Panel */}
      <div className="relative hidden lg:flex flex-col items-center justify-center bg-gradient-to-br from-blue-600 via-violet-600 to-purple-700 p-12 text-white">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 size-80 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 size-80 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-96 rounded-full bg-white/5 blur-2xl" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-8 text-center">
          <div className="flex items-center justify-center size-20 rounded-2xl bg-white/20 backdrop-blur-sm shadow-xl">
            <IndianRupee className="size-10" />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">{APP_NAME}</h1>
            <p className="text-lg text-white/80 max-w-md leading-relaxed">
              Your Personal Finance Operating System.
              Track expenses, investments, goals, and build your financial future — all in one place.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {[
              "Expense Tracking",
              "Investments",
              "Goals",
              "Analytics",
              "Net Worth",
              "Reports",
            ].map((feature) => (
              <span
                key={feature}
                className="rounded-full bg-white/15 backdrop-blur-sm px-4 py-1.5 text-sm font-medium"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Auth Form */}
      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
