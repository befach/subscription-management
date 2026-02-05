# Current Task Plan

## Project Status
> **Stack:** Vite + React + Convex (final - no Next.js migration)
> **Backend:** Complete
> **Frontend:** Complete (build passing)
> **Last Updated:** 2026-02-05

---

## Completed

### Backend (Convex) - DONE
- [x] `convex/schema.ts` - All tables with indexes
- [x] `convex/subscriptions.ts` - CRUD + renewal tracking
- [x] `convex/subscriptionRequests.ts` - Public submissions + admin approval (creates subscription on approve)
- [x] `convex/credentials.ts` - Vault with audit logging
- [x] `convex/dashboard.ts` - Analytics queries
- [x] `convex/categories.ts` - Category management
- [x] `convex/currencies.ts` - Currency management
- [x] `convex/auditLogs.ts` - Audit trail
- [x] `convex/crons.ts` - Scheduled task setup
- [x] `convex/actions/exchangeRates.ts` - ExchangeRate-API integration
- [x] `convex/actions/notifications.ts` - Zeptomail email notifications
- [x] `convex/lib/permissions.ts` - Admin auth middleware
- [x] `convex/lib/helpers.ts` - Validation utilities
- [x] `convex/seed.ts` - Database seeding

### Frontend (Vite + React) - DONE
- [x] Public pages: Dashboard, Subscriptions, SubmitRequest
- [x] Admin pages: Login, Dashboard, Approvals, Subscriptions, Vault, Currencies, Settings
- [x] shadcn/ui components
- [x] React Router (HashRouter)
- [x] Convex hooks integration
- [x] Loading states (Skeleton components)
- [x] Error handling (toast notifications)

### Bug Fixes (2026-02-05)
- [x] Type-only imports in helpers.ts, permissions.ts
- [x] Added node types to tsconfig for process.env
- [x] Fixed `createdAt` → `_creationTime` in Approvals.tsx
- [x] Fixed array type inference in Dashboard.tsx, Vault/index.tsx
- [x] Fixed public dashboard stats (upcomingRenewals property)
- [x] Updated formatDate to accept string | number
- [x] Fixed React hooks order in Dashboard.tsx
- [x] Fixed approve mutation to create subscription automatically

---

## Remaining Tasks

### Required Before Production
- [x] **Set environment variables** (ENCRYPTION_KEY, ADMIN_EMAIL, ADMIN_PASSWORD)
- [x] **Run database seed**
- [x] **Test full flow:** Public submission → Admin approval → Subscription created

### External API Configuration
- [ ] **Zeptomail (Email Notifications):**
  ```bash
  npx convex env set ZEPTOMAIL_API_KEY "Zoho-enczapikey_YOUR_KEY"
  npx convex env set NOTIFICATION_FROM_EMAIL "notifications@befach.com"
  npx convex env set NOTIFICATION_FROM_NAME "Befach Finance"
  npx convex env set ADMIN_NOTIFICATION_EMAIL "finance@befach.com"
  ```

- [ ] **ExchangeRate-API (Currency Rates):**
  ```bash
  npx convex env set EXCHANGERATE_API_KEY "your-api-key"
  ```

### Optional Enhancements
- [ ] Upgrade encryption from XOR to AES-256-GCM (see lessons.md for pattern)
- [ ] Add admin settings page to test email configuration
- [ ] Enable cron job for automatic exchange rate updates

---

## Environment Variables

### Required
```bash
CONVEX_DEPLOYMENT=dev:beloved-chickadee-865
VITE_CONVEX_URL=https://beloved-chickadee-865.convex.cloud
ENCRYPTION_KEY=<32+ char hex string>
ADMIN_EMAIL=finance@befach.com
ADMIN_PASSWORD=<your-password>
```

### Optional (External APIs)
```bash
# Email notifications (https://www.zoho.com/zeptomail)
ZEPTOMAIL_API_KEY=<your-zeptomail-api-key>
NOTIFICATION_FROM_EMAIL=notifications@befach.com
NOTIFICATION_FROM_NAME=Befach Finance
ADMIN_NOTIFICATION_EMAIL=finance@befach.com

# Currency exchange rates (https://www.exchangerate-api.com)
EXCHANGERATE_API_KEY=<your-exchangerate-api-key>
```

---

## Commands

```bash
# Development
npm run dev              # Start Vite dev server (localhost:5173)
npx convex dev           # Start Convex dev server (run in separate terminal)

# Build & Deploy
npm run build            # Build for production
npx convex deploy        # Deploy Convex functions

# Database
npx convex run seed:seedDatabase    # Seed initial data
npx convex run seed:clearDatabase   # Clear all data (dev only)
```
