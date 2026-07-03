// ==============================================
// Root Page — Redirect to dashboard or login
// Middleware handles the actual redirect logic
// ==============================================

import { redirect } from "next/navigation";

export default function HomePage() {
  // Middleware will redirect to /dashboard (if authenticated)
  // or /login (if not). This is a fallback.
  redirect("/login");
}
