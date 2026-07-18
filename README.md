# Flexroom Studio

Booking webapp for Flex Room Studio — San Cristóbal de las Casas, Chiapas.

**Stack:** Next.js 14 (App Router) · TypeScript · Supabase (PostgreSQL + Auth + Storage) · Stripe · Resend · Tailwind CSS · shadcn/ui · next-intl

---

## Getting Started

Copy the environment file and fill in your values:

```bash
cp .env.local.example .env.local
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

---

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_` or `sk_live_`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `RESEND_API_KEY` | Resend API key for email |
| `NEXT_PUBLIC_APP_URL` | Full app URL (e.g. `http://localhost:3001`) |

---

## Production Checklist

### 1. Vercel
- Import the GitHub repo at [vercel.com](https://vercel.com)
- Add all environment variables under **Project Settings → Environment Variables**

### 2. Supabase
- In **Authentication → URL Configuration**, set:
  - Site URL: `https://yourapp.com`
  - Redirect URLs: `https://yourapp.com/**`
- Enable **Google OAuth** under Auth → Providers → Google (requires a Google Cloud OAuth client ID/secret)
- RLS is already enabled on all tables
- Consider enabling **Point-in-Time Recovery** (paid plan) for the database

### 3. Stripe
- Replace `sk_test_` / `pk_test_` keys with live keys
- Create a webhook endpoint pointing to `https://yourapp.com/api/stripe/webhook`
- Update `STRIPE_WEBHOOK_SECRET` with the live webhook signing secret
- Ensure your Stripe account is activated for Mexico (MXN)

### 4. Resend
- Add a real API key and verify your sending domain at [resend.com](https://resend.com)

### 5. Environment variables to update
```
NEXT_PUBLIC_APP_URL=https://yourapp.com
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
```

### 6. Before go-live
- Delete or secure the debug endpoint at `src/app/api/debug/route.ts`
- Test a full booking flow end-to-end on production before sharing with clients

---

## Next Phase

Features planned for the next iteration:

### Notifications
- **Booking confirmation email** — Resend integration is wired up; verify API key and test delivery
- **24h class reminder email** — scheduled job to notify clients the day before their class
- **Package expiry warning** — email clients 3 days before their membership expires
- **Cancellation email** — confirmation when a client cancels a booking

### Booking UX
- **Waitlist** — when a class is full, clients can join a waitlist and get auto-notified when a spot opens

### Admin Panel
- **Editable homepage stats** — "9 instructores / 3 disciplinas / 50 min" are currently hardcoded; move to Configuración tab
- **Booking fill % on metrics** — show which classes consistently sell out vs. run empty
- **Admin audit log** — track who changed what and when (useful when handing off to studio staff)

### Technical
- **Custom 404 page** — currently shows the default Next.js error screen
- **Rate limiting** on `/api/bookings/checkout` and `/api/coupons/validate` to prevent abuse
- **Locale-aware error messages** in API responses (currently all in Spanish)
- **Error boundaries** on page-level components for friendly fallback UI on failures
