# FinanceOS

FinanceOS is a premium, state-of-the-art personal financial ledger, portfolio manager, and chronological timeline journal designed to give you absolute control over your money. Built on a modern tech stack, it provides an intuitive command center with interactive analytics, custom financial statements, budget tracking, and polymorphic notes linking.

```
┌────────────────────────────────────────────────────────┐
│                      FinanceOS                         │
├───────────────┬─────────────────┬──────────────────────┤
│  Ledgers      │  Planning       │  Intelligence        │
│  - Accounts   │  - Goals        │  - Cash Flow Charts  │
│  - Expenses   │  - Milestones   │  - Asset Allocation  │
│  - Incomes    │  - Timeline     │  - Printable Reports │
│  - Assets     │  - Relational   │  - Savings Trackers  │
└───────────────┴─────────────────┴──────────────────────┘
```

## 🚀 Key Features

*   **Command Center Dashboard**: Real-time KPIs tracking your Net Worth, Cash, Investments, and monthly Savings Margin, alongside recent activity log feeds.
*   **Polymorphic Notes & Timeline**: Keep a financial journal. Attach text records and files directly to specific financial transactions, goals, or investment assets using polymorphic junction models.
*   **Dynamic Analytics**: Visualizations powered by Recharts representing monthly income vs. outflow margins, category distributions, and investment asset class allocations.
*   **Printable Financial Statements**: Generate detailed statement reports for any Month, Quarter, Year, or Custom range. Print-specific stylesheet directives format your summaries into clean, printable PDFs.
*   **Asset & Investment Tracking**: Dynamic investment portfolio ledger supporting stocks, mutual funds, gold, fixed deposits, crypto, and real estate, detailing absolute gains, ROIs, and MoM allocation shifts.
*   **Goals & Milestones Roadmap**: Set financial goals and map them to targeted milestone timelines to track progress.

---

## 🛠️ Tech Stack

*   **Frontend Framework**: Next.js 16 (App Router) with React 19 and Turbopack.
*   **Database & Backend**: Supabase (PostgreSQL, Realtime, row-level security).
*   **Data Aggregation & Fetching**: TanStack React Query v5 for caching and server-side state synchronization.
*   **Data Validation & Forms**: React Hook Form with Zod validation schemas.
*   **Styling**: TailwindCSS with CSS custom properties.
*   **Visualizations**: Recharts for rendering graphs and gauges.

---

## 📁 Project Structure

```
├── src
│   ├── app
│   │   ├── (auth)              # Registration, Login pages and authentication helpers
│   │   ├── (dashboard)         # Core dashboard views (analytics, goals, expenses, etc.)
│   │   ├── globals.css         # Main Tailwind design system tokens
│   │   └── page.tsx            # Fallback auth router entrypoint
│   ├── components
│   │   ├── forms               # Dynamic forms (investment form, goals form, note drawer)
│   │   ├── layout              # Global AppSidebar and Header navigation
│   │   ├── notes               # Note viewer and relational cards
│   │   ├── ui                  # Shadcn primitive design components (cards, dialogs, badges)
│   │   └── shared              # Reusable skeletons and placeholder templates
│   ├── lib
│   │   ├── supabase            # Supabase SSR client configurations
│   │   ├── queries             # Relational fetch functions
│   │   └── validations         # Zod schemas for transaction and profile inputs
│   └── types                   # Core database and API type interfaces
├── supabase
│   └── migrations              # Database schema scripts (tables, view aggregations, triggers)
```

---

## 💾 Database Architecture

FinanceOS uses PostgreSQL row-level security (RLS) policies to isolate all user records. Key schemas include:

### Core Tables
*   `public.profiles`: Core user meta details (linked to `auth.users`).
*   `public.accounts`: Cash, savings accounts, credit cards, and institutions.
*   `public.categories`: Transaction taxonomy (supports nested parent-child hierarchies).
*   `public.expenses` / `public.incomes`: Basic ledger transactions.
*   `public.investments`: Wealth tracker containing purchase dates, invested capitals, and current market valuations.
*   `public.goals` / `public.milestones`: Target trackable goals and associated milestones.
*   `public.notes` / `public.note_tags` / `public.note_links`: Relational database structures mapping notes dynamically to any financial entity.

### Aggregation Views
*   `public.timeline_events`: Centralized feed compiling expenses, incomes, investments, and milestone completions into a unified chronology.
*   `public.monthly_cash_flow`: Aggregates cash inflows, outflows, savings, and savings margins by month and user.
*   `public.category_spending`: Grouped expenditures sorted by categories, colors, and transaction counts.

---

## ⚙️ Getting Started

### 1. Prerequisite Installations
*   Node.js (v20+)
*   npm or pnpm
*   Supabase CLI (optional, for local migrations)

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Apply Database Migrations
Deploy the database migrations to your Supabase project. You can run them via the Supabase SQL editor or use the CLI:
```bash
# Link local repository to your remote instance
npx supabase link --project-ref your-project-ref

# Push the migration sequence
npx supabase db push
```

The migrations will be executed in chronological sequence:
1.  `20260703000001_initial_schema.sql` (Profiles, Accounts, Categories, Tags)
2.  `20260703000005_create_expenses.sql` (Expenses & Recurring rules)
3.  `20260703000006_create_income_and_salary.sql` (Incomes & Salary records)
4.  `20260704000002_create_investments.sql` (Investments tracking)
5.  `20260704000003_create_goals_and_milestones.sql` (Savings goals and targets)
6.  `20260705000001_create_notes_and_timeline.sql` (Financial diary timeline events)
7.  `20260706000001_analytics_views.sql` (Performance aggregations)

### 5. Run the Application
Start the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view your FinanceOS workspace.
