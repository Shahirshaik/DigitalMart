# Digital Mart — Setup Guide

**Live:** https://digitalmart-tau.vercel.app

Public marketplace + courses catalog + seller profiles, backed by a real
Supabase project and seeded with demo content (18 sellers, 32 listings, 10
courses, 59 reviews) so the platform doesn't launch empty. Auth + onboarding
(module 4.1) works end-to-end. Escrow checkout, messaging, and the admin
panel are schema-ready but have no UI yet — buttons for those are visibly
disabled ("coming soon") rather than silently doing nothing.

**Demo accounts** — any seller/buyer email below signs in with password
`Demo@12345` (e.g. `priya.sharma@digitalmart.dev`). Full roster is in
`supabase/schema.sql`'s seed migrations or query `SELECT email, full_name
FROM users WHERE is_seller` in the Supabase SQL editor. These are fictional
launch-day personas on the `@digitalmart.dev` sandbox domain, not real people.

## Prerequisites
- Node.js 18+
- A free [Supabase](https://supabase.com) account

---

## Step 1 — Supabase Setup

1. Create a new Supabase project at https://supabase.com
2. Go to **SQL Editor → New Query**
3. Paste the entire contents of `supabase/schema.sql` and click **Run**
4. Go to **Project Settings → API** and copy the Project URL and anon public key

---

## Step 2 — Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in your Supabase values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key-here
```

---

## Step 3 — Install & Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

---

## Step 4 — Make Yourself Admin

1. Register an account at http://localhost:3000/auth/signup
2. In Supabase Dashboard → **Authentication → Users**, copy your UUID
3. Run in SQL Editor:

```sql
UPDATE users SET role = 'admin' WHERE id = 'paste-your-uuid-here';
```

4. Sign out and back in — admin accounts skip onboarding and go straight in.

---

## App Structure (foundation)

```
/                     → Public landing page
/auth/login           → Sign in
/auth/signup          → Register
/onboarding           → Categorization (student / professional / career-gap,
                         skill level, target field, learning format) — module 4.1
```

Everything else in the deck — listings (4.2), courses (4.3), escrow (4.4),
messaging (4.5), leads (4.6), recommendations (4.7), ratings (4.8), admin
panel (4.9), notifications (4.10), referrals (4.11) — has tables, RLS
policies, and triggers already defined in `supabase/schema.sql`, ready for
UI to be built on top module by module.

## Design notes carried over from the deck

- **One account, two roles.** `users.is_seller` is a flag, not a separate
  role — the same account can buy and sell. `users.role = 'admin'` is the
  only exclusive elevated role.
- **Escrow default split** is 70% seller / 30% platform, stored per-order as
  `orders.platform_fee_pct` so it can vary by category later without a schema
  change.
- **Confirmation window** defaults to 5 days from payment
  (`orders.confirm_deadline`), set by the `trg_order_escrow_timestamps`
  trigger — flag in the deck's open question if this should vary by category.
- **Referral credit** (10% of a referred user's purchase) is credited
  automatically via `trg_referral_credit` when an order moves from `held` to
  `confirmed`.
- **Reviews require a confirmed order** — the RLS policy on `reviews` checks
  `orders.status IN ('confirmed','released')` before allowing an insert, so
  fake reviews aren't possible at the DB layer.
