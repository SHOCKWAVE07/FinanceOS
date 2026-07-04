# FinanceOS Setup & Deployment Guide

This guide details the complete workflow to initialize, configure, migrate, and deploy the **FinanceOS** platform from scratch.

---

## 🛠️ Step 1: Local Environment Setup

### 1. Install Dependencies
Clone the repository and install the Node package dependencies:
```bash
npm install
```

### 2. Configure Local Environment Variables
Create a file named `.env.local` in the root of the project:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
*Note: `.env.local` is listed in `.gitignore` and must never be committed to git.*

### 3. Run Locally
Start the local Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗄️ Step 2: Supabase Backend Setup

### 1. CLI Authentication
Authenticate your local machine with the Supabase CLI:
```bash
npx supabase login
```

### 2. Link Remote Project
Link your local project workspace to your live Supabase database:
```bash
npx supabase link --project-ref <your-project-ref-id>
```
*You will be prompted to enter your database password.*

### 3. Push Database Migrations
Push the database schemas, triggers, indexes, and performance views to the remote instance:
```bash
npx supabase db push
```
*All migration files in `supabase/migrations/` have been written to be idempotent. If tables already exist, they will be skipped safely without throwing errors.*

### 4. Create public Storage Bucket
FinanceOS requires a storage container to hold document attachments:
1. In your **Supabase Dashboard**, click on **Storage** in the sidebar.
2. Click **New Bucket**.
3. Set the name to exactly: `attachments`
4. Toggle the bucket configuration to **Public**.
5. Save the bucket.

### 5. Configure Redirect URL Permissions
Allow users to authenticate and redirect back to your Netlify site URL:
1. In **Supabase Dashboard**, navigate to **Authentication** -> **URL Configuration**.
2. Set the **Site URL** to your Netlify production domain (e.g., `https://your-site-name.netlify.app`).
3. Add a redirect wildcard path to the **Redirect URLs** list:
   `https://your-site-name.netlify.app/**`
4. Save configuration.

---

## ☁️ Step 3: Netlify Frontend Deployment

### 1. Import Repository
1. Log in to [Netlify](https://app.netlify.com/).
2. Click **Add new site** -> **Import an existing project**.
3. Select **GitHub**, authenticate, and choose the `FinanceOS` repository.

### 2. Configure Build & Variables
Ensure the build parameters are configured as:
*   **Branch**: `main`
*   **Build command**: `npm run build`
*   **Publish directory**: `.next`

In the **Environment Variables** configuration, add your Supabase credentials:
*   `NEXT_PUBLIC_SUPABASE_URL` = `<your-supabase-project-url>`
*   `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `<your-supabase-anon-key>`

### 3. Bypass Secrets Detector
By default, Netlify's secrets scanner flags public keys compiled in client JS files and aborts builds. 

To prevent this build failure, a custom `netlify.toml` file is in the root directory specifying:
```toml
[build.environment]
  SECRETS_SCAN_OMIT_KEYS = "NEXT_PUBLIC_SUPABASE_ANON_KEY,NEXT_PUBLIC_SUPABASE_URL"
```
This forces Netlify to ignore those variables during the bundle inspection stage.

### 4. Deploy Site
Click **Deploy Site**. Once the compilation completes successfully, Netlify will generate your live production URL.
