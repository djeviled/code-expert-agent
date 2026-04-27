# Code Expert Agent

**Live site:** https://djee.zo.space

## What It Does

Code Expert Agent rescues AI-generated code that has stalled or is broken. The agent gets it to a fully functional, deployed application on Vercel or similar platforms.

## How It Works

1. **Sign up** → choose a tier (Site Rescue, Code Fix, or Bundle)
2. **Connect your platforms** (GitHub + Vercel required at onboarding)
3. **Chat with the agent** — paste your broken code, it diagnoses and fixes it
4. **Balance charged on success** — if the agent deploys successfully, the balance is captured. If it can't be fixed, no balance is charged.

## Pricing Model

| Tier | Upfront | Balance | Agent Support |
|------|---------|---------|---------------|
| **Site Rescue** | $49 | $99 on success | Up to 1 site |
| **Code Fix** | $79 | $149 on success | Up to 1 codebase |
| **Bundle** | $79 | $149 on success | 1 site + 1 codebase |
| **Starter** | — | $19/mo | 1 site/mo, cancel anytime |
| **Pro** | — | $49/mo | Unlimited sites |

> Balance is held for 7 days. If the agent successfully deploys your code, the balance is captured immediately — no waiting 7 days.

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/signup` | Sign up with GitHub + Vercel onboarding |
| `/login` | Login |
| `/checkout` | Stripe payment (card on file → balance captured on success) |
| `/success` | Payment success confirmation |
| `/chat` | Chat with the Code Expert Agent |
| `/dashboard` | User dashboard (admin panel at `/dashboard?admin=true`) |
| `/connect` | Connect GitHub and Vercel tokens |
| `/pay-balance` | Manually capture balance (admin/self-serve) |

## Backend API Routes

| Route | Purpose |
|-------|---------|
| `POST /api/user/register` | Create user |
| `GET /api/user/me` | Get current user |
| `POST /api/checkout/create` | Create Stripe PaymentIntent (authorize $1 + hold balance) |
| `POST /api/payments/capture-balance` | Capture balance on successful deploy |
| `POST /api/payments/release-hold` | Release balance hold (failed/deploy didn't happen) |
| `POST /api/stripe/webhook` | Stripe webhook handler |
| `GET /api/platforms/list` | Get user's connected platforms |
| `POST /api/platforms/save` | Save GitHub/Vercel tokens |
| `DELETE /api/platforms/delete` | Remove a connected platform |
| `GET /api/vercel/webhook` | Vercel deployment webhook |

## Database (Supabase / PostgreSQL)

Project ID: `pbfkqyrplcdzbnetfwjm`

### Tables

**users**
- `id` — UUID, primary key
- `email` — unique
- `name`
- `github_username`
- `github_token_encrypted` — encrypted
- `vercel_token_encrypted` — encrypted
- `stripe_customer_id`
- `stripe_subscription_id`
- `subscription_status` — 'active', 'canceled', 'past_due'
- `subscription_tier` — 'starter', 'pro'
- `sites_rescued` — count
- `code_fixed` — count
- `balance_captured` — boolean
- `balance_amount_cents`
- `opt_in_hold_balance` — boolean (default true)
- `hold_captured` — boolean
- `role` — 'user', 'admin'
- `created_at`

**deployments**
- `id`
- `user_id` — FK to users
- `platform` — 'vercel', 'netlify', 'github_pages'
- `repo_url`
- `deployment_url`
- `status` — 'pending', 'success', 'failed'
- `balance_charged` — boolean
- `balance_amount_cents`
- `created_at`

**balance_holds**
- `id`
- `user_id` — FK to users
- `stripe_payment_intent_id`
- `amount_cents` — balance amount held
- `status` — 'pending', 'captured', 'released', 'expired'
- `created_at`
- `captured_at`

**payments**
- `id`
- `user_id` — FK to users
- `stripe_payment_intent_id`
- `type` — 'upfront', 'balance', 'monthly_subscription'
- `amount_cents`
- `status` — 'succeeded', 'requires_capture', 'failed', 'refunded'
- `tier` — 'site', 'code', 'bundle'
- `created_at`

**platform_connections**
- `id`
- `user_id` — FK to users
- `provider` — 'github', 'vercel'
- `access_token_encrypted`
- `username`
- `created_at`

## Environment Variables (Secrets)

Set in **Zo Computer → Settings → Advanced → Secrets**:

| Key | Description |
|-----|-------------|
| `SUPABASE_URL` | `https://pbfkqyrplcdzbnetfwjm.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for admin operations) |
| `STRIPE_SECRET_KEY` | `sk_live_...` from Stripe dashboard |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` from Stripe webhook settings |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_...` from Stripe dashboard |
| `VERCEL_WEBHOOK_SECRET` | Secret for Vercel deploy webhook |
| `ENCRYPTION_KEY` | 32-char key for encrypting tokens in DB |

## Stripe Setup

1. Go to **Stripe Dashboard → Developers → API Keys**
2. Copy **Standard** secret key (starts with `sk_live_`)
3. Add to secrets as `STRIPE_SECRET_KEY`
4. Go to **Stripe Dashboard → Webhooks**
5. Add endpoint: `https://djee.zo.space/api/stripe/webhook`
6. Select events: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `invoice.paid`, `invoice.payment_failed`
7. Copy signing secret to `STRIPE_WEBHOOK_SECRET`

## Supabase Setup

1. Go to **Supabase Dashboard → Project Settings → API**
2. Copy **Service role** key
3. Add to secrets as `SUPABASE_SERVICE_ROLE_KEY`
4. Run schema SQL in **SQL Editor**

## Supabase Schema

See `schema.sql` in this repo.

## Deployment Flow

1. User signs up → card authorized for $1 + balance hold placed
2. User connects GitHub + Vercel during onboarding
3. User chats with agent, shares code/repo
4. Agent diagnoses, fixes, deploys
5. On successful deploy → `POST /api/payments/capture-balance` called → balance charged
6. On failure after 7 days → hold expires automatically via Stripe
7. Monthly subscribers billed via Stripe invoice events

## Admin

User with `role = 'admin'` can access `/dashboard?admin=true` for full user management.

## Local Development

```bash
cd code-expert-agent
bun install
bun run dev
```

Note: API routes run on zo.space server, not locally.