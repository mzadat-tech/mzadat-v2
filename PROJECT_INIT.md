# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MZADAT — Project Initialization Blueprint
# New Workspace Setup Guide
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

> **Purpose:** This document is a complete, self-contained blueprint for initializing a new workspace to build the Mzadat auction platform. Hand this to any agent or developer to set up the entire project from scratch.

---

## TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Monorepo Structure (Turborepo)](#3-monorepo-structure-turborepo)
4. [App Definitions](#4-app-definitions)
5. [Shared Packages](#5-shared-packages)
6. [Supabase Database Schema](#6-supabase-database-schema)
7. [Row-Level Security (RLS) Policies](#7-row-level-security-rls-policies)
8. [Supabase Storage Buckets](#8-supabase-storage-buckets)
9. [Environment Variables](#9-environment-variables)
10. [Setup Instructions](#10-setup-instructions)
11. [Data Migration (MySQL → Supabase)](#11-data-migration-mysql--supabase)
12. [Key Business Logic Reference](#12-key-business-logic-reference)

---

## 1. PROJECT OVERVIEW

| Field | Value |
|-------|-------|
| **Platform** | Mzadat — Online Auction & Bidding Marketplace |
| **Region** | Sultanate of Oman |
| **Languages** | Arabic (RTL, primary) + English (LTR) |
| **Currency** | OMR (Omani Rial) — 3 decimal places (e.g., 1.500) |
| **Timezone** | Asia/Muscat (GMT+4) |
| **Domain** | mzadat.om |
| **Architecture** | Turborepo Monorepo — 3 apps + shared packages |

### What We're Building

1. **Public Website + Merchant Panel** — Next.js 15 (App Router) for customers and merchants
2. **Admin Panel + CMS** — Next.js 15 with Payload CMS 3.0 embedded for content management
3. **REST API** — Node.js / Express.js + TypeScript (separate service for future iOS/Android mobile apps)
4. **Database** — Supabase (PostgreSQL) with improved schema, RLS, real-time subscriptions

---

## 2. TECHNOLOGY STACK

| Layer | Technology | Version |
|-------|-----------|---------|
| **Runtime** | Node.js | 20 LTS |
| **Package Manager** | pnpm | 9.x |
| **Monorepo** | Turborepo | latest |
| **Language** | TypeScript | 5.x |
| **Website** | Next.js (App Router) | 15.x |
| **Admin + CMS** | Next.js + Payload CMS | 15.x + 3.x |
| **API** | Express.js | 5.x |
| **Database** | Supabase (PostgreSQL 15) | latest |
| **Auth** | Supabase Auth | built-in |
| **Real-Time** | Supabase Realtime + WebSocket (ws) | built-in |
| **Storage** | Supabase Storage | built-in |
| **CSS Framework** | Tailwind CSS | v4 |
| **UI Components** | shadcn/ui + Radix UI | latest |
| **Rich Text Editor** | TipTap (via Payload) | latest |
| **PDF Generation** | @react-pdf/renderer | latest |
| **Email** | Resend | latest |
| **Validation** | Zod | latest |
| **Forms** | React Hook Form | latest |
| **State** | Zustand | latest |
| **Date/Time** | date-fns | latest |
| **Icons** | Lucide React | latest |
| **Charts** | Recharts | latest |
| **Testing** | Vitest + Playwright | latest |
| **Linting** | ESLint + Prettier | latest |
| **Error Monitoring** | Sentry | latest |
| **API Docs** | Swagger / OpenAPI | latest |

---

## 3. MONOREPO STRUCTURE (TURBOREPO)

```
mzadat/
├── turbo.json
├── package.json
├── pnpm-workspace.yaml
├── .env.example
├── .gitignore
├── tsconfig.json                    # Base TS config
│
├── apps/
│   ├── web/                         # Public website + merchant panel
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── app/                 # Next.js App Router
│   │       │   ├── (public)/        # Public routes (no auth)
│   │       │   │   ├── page.tsx                    # Homepage
│   │       │   │   ├── live-auction/page.tsx
│   │       │   │   ├── auction-product/page.tsx
│   │       │   │   ├── direct-product/page.tsx
│   │       │   │   ├── product/[slug]/page.tsx
│   │       │   │   ├── groups/page.tsx
│   │       │   │   ├── groups/[slug]/page.tsx
│   │       │   │   ├── shops/page.tsx
│   │       │   │   ├── shops/[slug]/page.tsx
│   │       │   │   ├── blog/page.tsx
│   │       │   │   ├── blog/[slug]/page.tsx
│   │       │   │   ├── page/[slug]/page.tsx        # CMS pages (about, terms, faq...)
│   │       │   │   ├── contact/page.tsx
│   │       │   │   ├── login/page.tsx
│   │       │   │   ├── register/page.tsx
│   │       │   │   ├── merchant/register/page.tsx
│   │       │   │   ├── forgot-password/page.tsx
│   │       │   │   └── ended-auctions/page.tsx
│   │       │   ├── (customer)/      # Customer dashboard (auth required)
│   │       │   │   ├── dashboard/page.tsx
│   │       │   │   ├── my-bids/page.tsx
│   │       │   │   ├── my-purchases/page.tsx
│   │       │   │   ├── wallet/page.tsx
│   │       │   │   ├── add-funds/page.tsx
│   │       │   │   ├── withdrawals/page.tsx
│   │       │   │   ├── transactions/page.tsx
│   │       │   │   ├── profile/page.tsx
│   │       │   │   ├── watchlist/page.tsx
│   │       │   │   ├── notifications/page.tsx
│   │       │   │   └── support/page.tsx
│   │       │   ├── (merchant)/      # Merchant dashboard (auth + role required)
│   │       │   │   ├── merchant/dashboard/page.tsx
│   │       │   │   ├── merchant/products/page.tsx
│   │       │   │   ├── merchant/products/create/page.tsx
│   │       │   │   ├── merchant/products/[id]/edit/page.tsx
│   │       │   │   ├── merchant/orders/page.tsx
│   │       │   │   ├── merchant/groups/page.tsx
│   │       │   │   ├── merchant/store/page.tsx
│   │       │   │   ├── merchant/wallet/page.tsx
│   │       │   │   ├── merchant/reports/page.tsx
│   │       │   │   └── merchant/withdrawals/page.tsx
│   │       │   ├── api/             # Next.js API routes (BFF / proxy)
│   │       │   │   └── webhook/route.ts
│   │       │   ├── layout.tsx
│   │       │   ├── not-found.tsx
│   │       │   ├── error.tsx
│   │       │   └── globals.css
│   │       ├── components/
│   │       │   ├── auction/         # Auction-specific components
│   │       │   │   ├── bid-panel.tsx
│   │       │   │   ├── bid-history.tsx
│   │       │   │   ├── countdown-timer.tsx
│   │       │   │   ├── auction-card.tsx
│   │       │   │   ├── group-card.tsx
│   │       │   │   ├── product-gallery.tsx
│   │       │   │   └── live-bidder-count.tsx
│   │       │   ├── layout/          # Layout components
│   │       │   │   ├── header.tsx
│   │       │   │   ├── footer.tsx
│   │       │   │   ├── sidebar.tsx
│   │       │   │   ├── mobile-nav.tsx
│   │       │   │   └── language-switcher.tsx
│   │       │   ├── dashboard/       # Dashboard components
│   │       │   ├── merchant/        # Merchant panel components
│   │       │   ├── cms/             # CMS-rendered blocks (matching Payload blocks)
│   │       │   │   ├── hero-block.tsx
│   │       │   │   ├── cta-block.tsx
│   │       │   │   ├── faq-block.tsx
│   │       │   │   ├── features-block.tsx
│   │       │   │   ├── testimonials-block.tsx
│   │       │   │   └── ...
│   │       │   └── shared/          # Shared UI pieces
│   │       ├── hooks/
│   │       │   ├── use-auction.ts
│   │       │   ├── use-bid.ts
│   │       │   ├── use-wallet.ts
│   │       │   ├── use-realtime.ts
│   │       │   └── use-auth.ts
│   │       ├── lib/
│   │       │   ├── supabase/
│   │       │   │   ├── client.ts        # Browser client
│   │       │   │   ├── server.ts        # Server client (RSC)
│   │       │   │   └── middleware.ts     # Auth middleware
│   │       │   ├── api.ts               # API client (calls Express API)
│   │       │   └── utils.ts
│   │       ├── providers/
│   │       │   ├── auth-provider.tsx
│   │       │   ├── realtime-provider.tsx
│   │       │   ├── theme-provider.tsx
│   │       │   └── locale-provider.tsx
│   │       ├── i18n/
│   │       │   ├── en.json
│   │       │   ├── ar.json
│   │       │   └── config.ts
│   │       └── styles/
│   │           └── globals.css
│   │
│   ├── admin/                       # Admin panel + Payload CMS
│   │   ├── next.config.ts
│   │   ├── payload.config.ts        # Payload CMS configuration
│   │   ├── tailwind.config.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (payload)/       # Payload CMS auto-generated admin UI
│   │       │   │   ├── admin/[[...segments]]/page.tsx
│   │       │   │   └── api/[...slug]/route.ts
│   │       │   ├── (dashboard)/     # Custom admin dashboard pages
│   │       │   │   ├── page.tsx                    # Admin dashboard home
│   │       │   │   ├── users/page.tsx
│   │       │   │   ├── merchants/page.tsx
│   │       │   │   ├── products/page.tsx
│   │       │   │   ├── auctions/page.tsx
│   │       │   │   ├── groups/page.tsx
│   │       │   │   ├── orders/page.tsx
│   │       │   │   ├── wallets/page.tsx
│   │       │   │   ├── deposits/page.tsx
│   │       │   │   ├── withdrawals/page.tsx
│   │       │   │   ├── reports/page.tsx
│   │       │   │   ├── support/page.tsx
│   │       │   │   ├── settings/page.tsx
│   │       │   │   └── corporate/page.tsx
│   │       │   ├── layout.tsx
│   │       │   └── globals.css
│   │       ├── collections/         # Payload CMS collections
│   │       │   ├── Users.ts
│   │       │   ├── Pages.ts
│   │       │   ├── Blogs.ts
│   │       │   ├── BlogCategories.ts
│   │       │   ├── Media.ts
│   │       │   ├── Menus.ts
│   │       │   ├── Categories.ts
│   │       │   ├── EmailTemplates.ts
│   │       │   └── Settings.ts
│   │       ├── blocks/              # Payload CMS content blocks
│   │       │   ├── Hero.ts
│   │       │   ├── CallToAction.ts
│   │       │   ├── ImageGallery.ts
│   │       │   ├── FAQ.ts
│   │       │   ├── Features.ts
│   │       │   ├── Testimonials.ts
│   │       │   ├── StatsCounter.ts
│   │       │   ├── Timeline.ts
│   │       │   ├── TeamGrid.ts
│   │       │   ├── VideoEmbed.ts
│   │       │   ├── MapEmbed.ts
│   │       │   ├── CodeEditor.ts
│   │       │   ├── RichText.ts
│   │       │   └── Spacer.ts
│   │       ├── globals/             # Payload CMS globals
│   │       │   ├── SiteSettings.ts
│   │       │   ├── Header.ts
│   │       │   └── Footer.ts
│   │       ├── components/
│   │       │   ├── dashboard/
│   │       │   └── shared/
│   │       ├── hooks/
│   │       └── lib/
│   │
│   └── api/                         # Express.js REST API
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts             # Entry point
│           ├── app.ts               # Express app setup
│           ├── config/
│           │   ├── database.ts      # Supabase client init
│           │   ├── env.ts           # Environment validation (Zod)
│           │   ├── cors.ts
│           │   └── swagger.ts       # OpenAPI config
│           ├── middleware/
│           │   ├── auth.ts          # JWT verification via Supabase
│           │   ├── rate-limit.ts
│           │   ├── validate.ts      # Zod request validation
│           │   ├── role-guard.ts    # Role-based access
│           │   ├── error-handler.ts
│           │   └── logger.ts
│           ├── routes/
│           │   ├── auth.routes.ts
│           │   ├── user.routes.ts
│           │   ├── product.routes.ts
│           │   ├── auction.routes.ts
│           │   ├── bid.routes.ts
│           │   ├── group.routes.ts
│           │   ├── order.routes.ts
│           │   ├── wallet.routes.ts
│           │   ├── payment.routes.ts
│           │   ├── store.routes.ts
│           │   ├── category.routes.ts
│           │   ├── blog.routes.ts
│           │   ├── support.routes.ts
│           │   ├── report.routes.ts
│           │   ├── media.routes.ts
│           │   ├── settings.routes.ts
│           │   └── index.ts         # Route aggregator
│           ├── controllers/
│           │   ├── auth.controller.ts
│           │   ├── user.controller.ts
│           │   ├── product.controller.ts
│           │   ├── auction.controller.ts
│           │   ├── bid.controller.ts
│           │   ├── group.controller.ts
│           │   ├── order.controller.ts
│           │   ├── wallet.controller.ts
│           │   ├── payment.controller.ts
│           │   ├── store.controller.ts
│           │   ├── category.controller.ts
│           │   ├── blog.controller.ts
│           │   ├── support.controller.ts
│           │   ├── report.controller.ts
│           │   ├── media.controller.ts
│           │   └── settings.controller.ts
│           ├── services/            # Business logic layer
│           │   ├── auction.service.ts
│           │   ├── bid.service.ts
│           │   ├── wallet.service.ts
│           │   ├── winner.service.ts
│           │   ├── payment.service.ts
│           │   ├── email.service.ts
│           │   ├── pdf.service.ts
│           │   ├── media.service.ts
│           │   └── realtime.service.ts
│           ├── jobs/                # Background jobs / cron
│           │   ├── close-expired-auctions.ts
│           │   ├── declare-winners.ts
│           │   ├── refund-non-winners.ts
│           │   ├── winner-audit.ts
│           │   └── scheduled-reports.ts
│           ├── websocket/           # WebSocket handlers
│           │   ├── index.ts
│           │   ├── bid-handler.ts
│           │   └── presence-handler.ts
│           ├── types/
│           │   ├── express.d.ts
│           │   └── index.ts
│           └── utils/
│               ├── custom-id.ts     # Generate C0001, MC0001
│               ├── invoice.ts
│               ├── watermark.ts
│               └── helpers.ts
│
├── packages/
│   ├── ui/                          # Shared UI component library
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tailwind.config.ts
│   │   └── src/
│   │       ├── components/          # shadcn/ui + custom components
│   │       │   ├── button.tsx
│   │       │   ├── input.tsx
│   │       │   ├── select.tsx
│   │       │   ├── dialog.tsx
│   │       │   ├── dropdown-menu.tsx
│   │       │   ├── table.tsx
│   │       │   ├── card.tsx
│   │       │   ├── badge.tsx
│   │       │   ├── avatar.tsx
│   │       │   ├── toast.tsx
│   │       │   ├── skeleton.tsx
│   │       │   ├── tabs.tsx
│   │       │   ├── sheet.tsx
│   │       │   ├── separator.tsx
│   │       │   ├── switch.tsx
│   │       │   ├── checkbox.tsx
│   │       │   ├── radio-group.tsx
│   │       │   ├── textarea.tsx
│   │       │   ├── label.tsx
│   │       │   ├── pagination.tsx
│   │       │   ├── calendar.tsx
│   │       │   ├── date-picker.tsx
│   │       │   ├── command.tsx
│   │       │   ├── popover.tsx
│   │       │   ├── tooltip.tsx
│   │       │   ├── alert.tsx
│   │       │   ├── progress.tsx
│   │       │   ├── slider.tsx
│   │       │   ├── accordion.tsx
│   │       │   ├── breadcrumb.tsx
│   │       │   ├── data-table.tsx   # Reusable data table with sorting/filtering
│   │       │   ├── file-upload.tsx  # Drag & drop upload
│   │       │   ├── image-gallery.tsx
│   │       │   ├── price-display.tsx # OMR formatted (3 decimals)
│   │       │   ├── countdown.tsx    # Auction countdown timer
│   │       │   ├── status-badge.tsx # Colored badges for statuses
│   │       │   └── rtl-wrapper.tsx  # RTL/LTR context wrapper
│   │       ├── lib/
│   │       │   └── utils.ts         # cn() utility, formatOMR(), etc.
│   │       └── index.ts             # Barrel export
│   │
│   ├── db/                          # Database client, types & queries
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── client.ts            # Supabase client factory
│   │       ├── types.ts             # Auto-generated from Supabase
│   │       ├── enums.ts             # Shared enum definitions
│   │       └── queries/             # Reusable query builders
│   │           ├── users.ts
│   │           ├── products.ts
│   │           ├── auctions.ts
│   │           ├── orders.ts
│   │           ├── wallets.ts
│   │           └── groups.ts
│   │
│   ├── validators/                  # Shared Zod schemas
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── auth.ts
│   │       ├── user.ts
│   │       ├── product.ts
│   │       ├── bid.ts
│   │       ├── order.ts
│   │       ├── wallet.ts
│   │       ├── group.ts
│   │       ├── store.ts
│   │       └── index.ts
│   │
│   ├── config/                      # Shared configuration
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── constants.ts         # App-wide constants
│   │       ├── permissions.ts       # Role → permission matrix
│   │       └── index.ts
│   │
│   ├── email/                       # Email templates (React Email)
│   │   ├── package.json
│   │   └── src/
│   │       ├── templates/
│   │       │   ├── verification.tsx
│   │       │   ├── deposit-confirmation.tsx
│   │       │   ├── bid-winner.tsx
│   │       │   ├── final-payment.tsx
│   │       │   ├── outbid-notification.tsx
│   │       │   ├── withdrawal.tsx
│   │       │   ├── order-confirmation.tsx
│   │       │   ├── password-reset.tsx
│   │       │   ├── welcome.tsx
│   │       │   └── weekly-digest.tsx
│   │       └── index.ts
│   │
│   └── tsconfig/                    # Shared TypeScript configs
│       ├── base.json
│       ├── nextjs.json
│       ├── node.json
│       └── react-library.json
│
├── supabase/                        # Supabase local dev & migrations
│   ├── config.toml
│   ├── seed.sql
│   └── migrations/
│       ├── 00001_create_enums.sql
│       ├── 00002_create_users.sql
│       ├── 00003_create_stores.sql
│       ├── 00004_create_categories.sql
│       ├── 00005_create_products.sql
│       ├── 00006_create_groups.sql
│       ├── 00007_create_orders.sql
│       ├── 00008_create_wallets.sql
│       ├── 00009_create_pages_cms.sql
│       ├── 00010_create_blogs.sql
│       ├── 00011_create_support.sql
│       ├── 00012_create_settings.sql
│       ├── 00013_create_notifications.sql
│       ├── 00014_create_audit_log.sql
│       ├── 00015_create_rls_policies.sql
│       ├── 00016_create_functions.sql
│       ├── 00017_create_triggers.sql
│       └── 00018_create_indexes.sql
│
├── scripts/                         # Utility scripts
│   ├── migrate-mysql-to-supabase.ts
│   ├── generate-types.ts
│   └── seed-dev-data.ts
│
└── docs/
    ├── API.md
    ├── DEPLOYMENT.md
    └── ARCHITECTURE.md
```

---

## 4. APP DEFINITIONS

### 4.1 — `apps/web` (Public Website + Merchant Panel)

**Framework:** Next.js 15 (App Router, React Server Components)
**Port:** 3000
**Styling:** Tailwind CSS v4 + shadcn/ui + Radix UI
**Rendering:** SSR for SEO-critical pages, CSR for interactive dashboards

**Key Features:**
- Public-facing auction browsing (homepage, listings, product detail, groups, stores, blog)
- Customer dashboard (bids, purchases, wallet, transactions, profile, watchlist, notifications)
- Merchant panel (products CRUD, orders, groups, store management, reports, withdrawals)
- Real-time bidding via WebSocket connection to Express API
- RTL/LTR direction switch with `next-intl` or custom locale provider
- PWA manifest for installable app experience
- SEO: SSR pages with JSON-LD structured data, dynamic OG images
- CMS block rendering — Payload CMS blocks (Hero, CTA, FAQ, Features, etc.) are React components in `apps/web` that receive JSON data from the Payload API and render identically to the admin preview

**Auth Flow:**
- Supabase Auth handles registration, login, magic link, social login (Google, Apple)
- JWT token stored as httpOnly cookie
- Middleware checks `supabase.auth.getSession()` for protected routes
- Role extracted from `public.profiles` table joined with auth user

### 4.2 — `apps/admin` (Admin Panel + Payload CMS)

**Framework:** Next.js 15 + Payload CMS 3.0 (embedded as Next.js plugin)
**Port:** 3001
**Styling:** Tailwind CSS v4 (admin-specific theme) + Payload's built-in admin UI
**Database:** Payload uses the same Supabase PostgreSQL database via its Postgres adapter

**Payload CMS Configuration:**
```ts
// payload.config.ts — conceptual outline
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'

export default buildConfig({
  admin: { user: 'admins' },
  editor: lexicalEditor(),
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL }
  }),
  plugins: [
    s3Storage({
      bucket: process.env.SUPABASE_STORAGE_BUCKET,
      config: {
        endpoint: process.env.SUPABASE_STORAGE_ENDPOINT,
        credentials: {
          accessKeyId: process.env.SUPABASE_STORAGE_KEY,
          secretAccessKey: process.env.SUPABASE_STORAGE_SECRET,
        },
      },
    }),
  ],
  collections: [Pages, Blogs, BlogCategories, Media, Menus, EmailTemplates, Categories],
  globals: [SiteSettings, Header, Footer],
})
```

**Key Features:**
- Payload provides: block-based page builder, media library, version history, draft/publish workflow, localization (en + ar), access control, API auto-generation
- Custom admin dashboard pages for: user management, product/auction management, group management, order/financial management, wallet management, deposits/withdrawals, reports, support tickets, settings
- Real-time activity feed (bids, registrations, payments)
- Revenue analytics (Recharts dashboards)

### 4.3 — `apps/api` (Express.js REST API)

**Framework:** Express.js 5 + TypeScript
**Port:** 4000
**Purpose:** Headless API server — serves web app now, mobile apps (iOS/Android) in future

**Key Features:**
- RESTful endpoints for all business operations
- WebSocket server (ws library) for real-time bidding, presence, notifications
- Background jobs via node-cron:
  - Auto-close expired auctions (every minute)
  - Declare winners on auction close
  - Refund non-winner deposits
  - Winner audit (daily 6AM)
  - Scheduled report emails
- PDF generation for invoices, receipts, reports (EN + AR RTL)
- Payment gateway integrations (Stripe, PayPal, bank transfer)
- Image processing (watermarking, resize, WebP conversion)
- Email sending via Resend with React Email templates
- Swagger/OpenAPI documentation at `/api/docs`
- Request validation with Zod schemas (shared from `packages/validators`)
- Rate limiting per endpoint
- CORS configured for web + admin + future mobile origins

**Auth Middleware:**
- Validates Supabase JWT from `Authorization: Bearer <token>` header
- Extracts user ID, role from JWT claims
- Role guard middleware: `requireRole('admin')`, `requireRole('merchant')`, etc.

---

## 5. SHARED PACKAGES

| Package | Purpose |
|---------|---------|
| `@mzadat/ui` | shadcn/ui + Radix UI component library — shared by `web` and `admin` apps. Includes auction-specific components (countdown, bid panel, price display, status badges) |
| `@mzadat/db` | Supabase client factory, auto-generated TypeScript types (`supabase gen types`), reusable query builders |
| `@mzadat/validators` | Zod schemas for all entities — used in both API request validation and form validation on the frontend |
| `@mzadat/config` | Constants (role IDs, status codes, bid increments, commission rates), permission matrix |
| `@mzadat/email` | React Email templates for all transactional emails |
| `@mzadat/tsconfig` | Shared TypeScript configuration for consistency |

---

## 6. SUPABASE DATABASE SCHEMA

> **Design Principles:**
> - UUID primary keys everywhere (not auto-increment integers)
> - `numeric(12,3)` for all money fields (OMR has 3 decimal places)
> - PostgreSQL native enums instead of magic integers
> - JSONB for translations (`{ "en": "...", "ar": "..." }`) instead of separate translation tables
> - `created_at` / `updated_at` on every table via trigger
> - Soft deletes via `deleted_at` timestamp where appropriate
> - Foreign keys with explicit ON DELETE behavior
> - GIN indexes on JSONB columns, B-tree on frequently filtered columns

### 6.1 — Enums

```sql
-- 00001_create_enums.sql

CREATE TYPE user_role AS ENUM ('customer', 'merchant', 'admin', 'super_admin');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending_verification');
CREATE TYPE register_type AS ENUM ('individual', 'company');

CREATE TYPE product_sale_type AS ENUM ('auction', 'direct');
CREATE TYPE product_status AS ENUM ('draft', 'pending', 'published', 'inactive', 'closed');
CREATE TYPE product_schedule_type AS ENUM ('default', 'scheduled');
CREATE TYPE deposit_type AS ENUM ('fixed', 'percentage');

CREATE TYPE order_type AS ENUM ('bid', 'purchase');
CREATE TYPE order_status AS ENUM (
  'processing', 'win', 'rejected', 'completed',
  'on_hold', 'delivered', 'refunded', 'shipped'
);
CREATE TYPE payment_status AS ENUM ('partial', 'unpaid', 'paid');

CREATE TYPE wallet_tx_type AS ENUM (
  'deposit', 'bid', 'purchase', 'withdraw',
  'return', 'refund', 'bid_final_payment',
  'admin_adjustment', 'commission'
);
CREATE TYPE wallet_tx_status AS ENUM ('pending', 'completed', 'rejected');

CREATE TYPE withdrawal_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TYPE group_status AS ENUM ('upcoming', 'active', 'closed', 'cancelled');

CREATE TYPE blog_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE page_status AS ENUM ('draft', 'published', 'archived');

CREATE TYPE content_status AS ENUM ('active', 'inactive');
```

### 6.2 — Core Tables

```sql
-- 00002_create_users.sql
-- NOTE: Auth is handled by Supabase Auth (auth.users).
-- This profiles table extends auth.users with app-specific data.

CREATE TABLE public.profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  custom_id       text UNIQUE NOT NULL,               -- C0001, MC0001
  role            user_role NOT NULL DEFAULT 'customer',
  status          user_status NOT NULL DEFAULT 'pending_verification',
  register_as     register_type NOT NULL DEFAULT 'individual',

  -- Personal info (bilingual)
  first_name      text NOT NULL,
  last_name       text NOT NULL,
  first_name_ar   text,                                -- Arabic name
  last_name_ar    text,                                -- Arabic name
  email           text UNIQUE NOT NULL,
  phone           text,
  image           text,                                -- Avatar path in storage

  -- Identity
  individual_id   text,                                -- National ID / Civil ID
  company_name    text,
  company_id      text,                                -- Commercial registration

  -- Location
  country_id      uuid REFERENCES public.countries(id),
  state_id        uuid REFERENCES public.states(id),
  city_id         uuid REFERENCES public.cities(id),
  address         text,
  zip_code        text,

  -- VIP & Flags
  is_vip          boolean NOT NULL DEFAULT false,
  email_verified  boolean NOT NULL DEFAULT false,

  -- Financial
  wallet_balance  numeric(12,3) NOT NULL DEFAULT 0.000,

  -- Corporate domain link
  corporate_domain_id uuid REFERENCES public.corporate_domains(id),

  -- Metadata
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz                          -- Soft delete
);

CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_status ON public.profiles(status);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_custom_id ON public.profiles(custom_id);
CREATE INDEX idx_profiles_corporate ON public.profiles(corporate_domain_id) WHERE corporate_domain_id IS NOT NULL;
```

```sql
-- 00003_create_stores.sql

CREATE TABLE public.stores (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slug            text UNIQUE NOT NULL,

  -- Bilingual name
  name            jsonb NOT NULL DEFAULT '{}',         -- {"en": "...", "ar": "..."}
  description     jsonb DEFAULT '{}',

  -- Contact
  email           text,
  phone           text,
  address         text,

  -- Branding
  logo            text,                                -- Storage path
  cover_image     text,                                -- Storage path

  -- Social links
  social_links    jsonb DEFAULT '{}',                  -- {"facebook": "...", "instagram": "...", "twitter": "...", "youtube": "...", "linkedin": "...", "pinterest": "..."}

  -- Settings
  commission_rate numeric(5,2) DEFAULT 0.00,           -- Per-merchant commission %
  vat_applicable  boolean NOT NULL DEFAULT false,
  vat_rate        numeric(5,2) DEFAULT 5.00,           -- VAT % (Oman standard)

  status          content_status NOT NULL DEFAULT 'active',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_stores_owner ON public.stores(owner_id);
CREATE INDEX idx_stores_slug ON public.stores(slug);
```

```sql
-- 00004_create_categories.sql

CREATE TABLE public.categories (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id       uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  slug            text UNIQUE NOT NULL,
  name            jsonb NOT NULL DEFAULT '{}',         -- {"en": "...", "ar": "..."}
  description     jsonb DEFAULT '{}',
  image           text,                                -- Storage path
  icon            text,
  sort_order      int NOT NULL DEFAULT 0,
  status          content_status NOT NULL DEFAULT 'active',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_parent ON public.categories(parent_id);
CREATE INDEX idx_categories_slug ON public.categories(slug);
CREATE INDEX idx_categories_status ON public.categories(status);
```

```sql
-- 00005_create_products.sql

CREATE TABLE public.products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id     uuid NOT NULL REFERENCES public.profiles(id),
  store_id        uuid REFERENCES public.stores(id),
  category_id     uuid REFERENCES public.categories(id),
  group_id        uuid REFERENCES public.groups(id) ON DELETE SET NULL,

  -- Core
  slug            text UNIQUE NOT NULL,
  name            jsonb NOT NULL DEFAULT '{}',         -- {"en": "...", "ar": "..."}
  description     jsonb DEFAULT '{}',                  -- Rich text content
  short_description jsonb DEFAULT '{}',
  feature_image   text,                                -- Storage path

  -- Sale type
  sale_type       product_sale_type NOT NULL DEFAULT 'auction',
  schedule_type   product_schedule_type NOT NULL DEFAULT 'default',

  -- Pricing
  price           numeric(12,3) NOT NULL DEFAULT 0.000,    -- Starting price / direct sale price
  sale_price      numeric(12,3),                            -- Discounted price (direct sale)
  min_bid_price   numeric(12,3) NOT NULL DEFAULT 0.000,    -- Minimum starting bid
  reserve_price   numeric(12,3),                            -- Secret minimum (merchant can reject if not met)
  current_bid     numeric(12,3) NOT NULL DEFAULT 0.000,    -- Cached current highest bid

  -- Bid increments (tiered)
  bid_increment_1 numeric(12,3) NOT NULL DEFAULT 1.000,    -- Default increment
  bid_increment_2 numeric(12,3),                            -- 2nd tier increment
  bid_increment_3 numeric(12,3),                            -- 3rd tier increment
  bid_increment_4 numeric(12,3),                            -- 4th tier increment

  -- Deposit
  min_deposit     numeric(12,3) NOT NULL DEFAULT 0.000,
  min_deposit_type deposit_type NOT NULL DEFAULT 'fixed',

  -- Schedule
  start_date      timestamptz,
  end_date        timestamptz,
  original_end_date timestamptz,                       -- Before anti-snipe extensions

  -- Anti-sniping
  snipe_extension_seconds int NOT NULL DEFAULT 120,    -- 2 minutes
  max_snipe_extension_minutes int NOT NULL DEFAULT 30,
  total_extensions int NOT NULL DEFAULT 0,

  -- Location (for inspection)
  location        text,
  inspection_notes text,

  -- SEO
  meta_title      jsonb DEFAULT '{}',
  meta_keywords   jsonb DEFAULT '{}',
  meta_description jsonb DEFAULT '{}',

  -- Counters (cached)
  bid_count       int NOT NULL DEFAULT 0,
  view_count      int NOT NULL DEFAULT 0,

  status          product_status NOT NULL DEFAULT 'draft',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE INDEX idx_products_merchant ON public.products(merchant_id);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_group ON public.products(group_id);
CREATE INDEX idx_products_status ON public.products(status);
CREATE INDEX idx_products_sale_type ON public.products(sale_type);
CREATE INDEX idx_products_slug ON public.products(slug);
CREATE INDEX idx_products_dates ON public.products(start_date, end_date);
CREATE INDEX idx_products_live ON public.products(status, sale_type, start_date, end_date)
  WHERE status = 'published' AND sale_type = 'auction';
```

```sql
-- Product gallery (multiple images per product)
CREATE TABLE public.product_galleries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image           text NOT NULL,                       -- Storage path
  sort_order      int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_galleries_product ON public.product_galleries(product_id);

-- Product specifications
CREATE TABLE public.product_specifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  label           jsonb NOT NULL DEFAULT '{}',         -- {"en": "Color", "ar": "اللون"}
  value           jsonb NOT NULL DEFAULT '{}',         -- {"en": "Red", "ar": "أحمر"}
  sort_order      int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_specs_product ON public.product_specifications(product_id);

-- Product reviews
CREATE TABLE public.product_reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES public.profiles(id),
  rating          smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         text,
  admin_reply     text,
  status          content_status NOT NULL DEFAULT 'active',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reviews_product ON public.product_reviews(product_id);
```

```sql
-- 00006_create_groups.sql

CREATE TABLE public.groups (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  merchant_id     uuid NOT NULL REFERENCES public.profiles(id),

  -- Bilingual
  name            jsonb NOT NULL DEFAULT '{}',         -- {"en": "...", "ar": "..."}
  description     jsonb DEFAULT '{}',
  image           text,                                -- Storage path

  -- Schedule
  start_date      timestamptz NOT NULL,
  end_date        timestamptz NOT NULL,
  inspection_start_date timestamptz,
  inspection_end_date   timestamptz,

  -- Deposit (group-level — one deposit covers all products)
  min_deposit     numeric(12,3) NOT NULL DEFAULT 0.000,

  status          group_status NOT NULL DEFAULT 'upcoming',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_groups_store ON public.groups(store_id);
CREATE INDEX idx_groups_merchant ON public.groups(merchant_id);
CREATE INDEX idx_groups_status ON public.groups(status);
CREATE INDEX idx_groups_dates ON public.groups(start_date, end_date);
```

```sql
-- 00007_create_orders.sql

CREATE TABLE public.orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number    text UNIQUE NOT NULL,                -- MZD-2026-0001
  user_id         uuid NOT NULL REFERENCES public.profiles(id),
  product_id      uuid NOT NULL REFERENCES public.products(id),
  merchant_id     uuid NOT NULL REFERENCES public.profiles(id),
  group_id        uuid REFERENCES public.groups(id),

  type            order_type NOT NULL,
  status          order_status NOT NULL DEFAULT 'processing',
  payment_status  payment_status NOT NULL DEFAULT 'unpaid',

  -- Amounts
  bid_amount      numeric(12,3) NOT NULL DEFAULT 0.000,    -- Winning bid
  amount          numeric(12,3) NOT NULL DEFAULT 0.000,    -- Base amount
  tax_amount      numeric(12,3) NOT NULL DEFAULT 0.000,    -- VAT
  commission_amount numeric(12,3) NOT NULL DEFAULT 0.000,  -- Platform commission
  total_amount    numeric(12,3) NOT NULL DEFAULT 0.000,    -- Grand total

  -- Deposit tracking
  deposit_amount  numeric(12,3) NOT NULL DEFAULT 0.000,
  deposit_paid    boolean NOT NULL DEFAULT false,

  -- Billing info (snapshot at order time)
  billing_name    text,
  billing_email   text,
  billing_phone   text,
  billing_address text,
  billing_country uuid REFERENCES public.countries(id),
  billing_state   uuid REFERENCES public.states(id),
  billing_city    uuid REFERENCES public.cities(id),

  -- Shipping info
  shipping_name   text,
  shipping_address text,
  shipping_country uuid REFERENCES public.countries(id),
  shipping_state  uuid REFERENCES public.states(id),
  shipping_city   uuid REFERENCES public.cities(id),

  -- Restriction
  is_restricted   boolean NOT NULL DEFAULT false,

  -- Payment method used
  payment_method  text,
  transaction_id  text,

  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_user ON public.orders(user_id);
CREATE INDEX idx_orders_product ON public.orders(product_id);
CREATE INDEX idx_orders_merchant ON public.orders(merchant_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_number ON public.orders(order_number);
CREATE INDEX idx_orders_type ON public.orders(type);
```

```sql
-- Bid history
CREATE TABLE public.bid_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  user_id         uuid NOT NULL REFERENCES public.profiles(id),
  product_id      uuid NOT NULL REFERENCES public.products(id),
  merchant_id     uuid NOT NULL REFERENCES public.profiles(id),
  amount          numeric(12,3) NOT NULL,
  order_number    text,
  is_winning      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz                          -- Soft delete for admin bid removal
);

CREATE INDEX idx_bids_product ON public.bid_history(product_id);
CREATE INDEX idx_bids_user ON public.bid_history(user_id);
CREATE INDEX idx_bids_product_amount ON public.bid_history(product_id, amount DESC);
CREATE INDEX idx_bids_winning ON public.bid_history(product_id, is_winning) WHERE is_winning = true;

-- Deleted bid log (audit trail)
CREATE TABLE public.deleted_bid_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id          uuid NOT NULL,
  product_id      uuid NOT NULL,
  user_id         uuid NOT NULL,
  amount          numeric(12,3) NOT NULL,
  deleted_by      uuid NOT NULL REFERENCES public.profiles(id), -- Admin who deleted
  reason          text,
  original_data   jsonb NOT NULL,                      -- Full bid record snapshot
  created_at      timestamptz NOT NULL DEFAULT now()
);
```

```sql
-- 00008_create_wallets.sql

CREATE TABLE public.wallet_transactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id),
  order_id        uuid REFERENCES public.orders(id),
  product_id      uuid REFERENCES public.products(id),

  type            wallet_tx_type NOT NULL,
  status          wallet_tx_status NOT NULL DEFAULT 'pending',

  -- Amounts
  amount          numeric(12,3) NOT NULL DEFAULT 0.000,
  admin_commission numeric(12,3) NOT NULL DEFAULT 0.000,
  merchant_amount numeric(12,3) NOT NULL DEFAULT 0.000,
  tax_amount      numeric(12,3) NOT NULL DEFAULT 0.000,
  total_amount    numeric(12,3) NOT NULL DEFAULT 0.000,

  -- Payment details
  payment_method  text,
  transaction_id  text,                                -- Gateway transaction ID
  gateway_amount  numeric(12,3),                       -- Amount in gateway currency
  currency        text DEFAULT 'OMR',

  -- Proof (for bank transfers)
  proof_document  text,                                -- Storage path

  description     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wallet_user ON public.wallet_transactions(user_id);
CREATE INDEX idx_wallet_type ON public.wallet_transactions(type);
CREATE INDEX idx_wallet_status ON public.wallet_transactions(status);
CREATE INDEX idx_wallet_order ON public.wallet_transactions(order_id);
CREATE INDEX idx_wallet_created ON public.wallet_transactions(created_at DESC);

-- Bank deposits (admin approval queue)
CREATE TABLE public.bank_deposits (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id),
  wallet_tx_id    uuid REFERENCES public.wallet_transactions(id),
  amount          numeric(12,3) NOT NULL,
  proof_document  text NOT NULL,                       -- Storage path
  bank_name       text,
  reference_number text,
  status          wallet_tx_status NOT NULL DEFAULT 'pending',
  admin_notes     text,
  reviewed_by     uuid REFERENCES public.profiles(id),
  reviewed_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bank_deposits_user ON public.bank_deposits(user_id);
CREATE INDEX idx_bank_deposits_status ON public.bank_deposits(status);

-- Withdrawal requests
CREATE TABLE public.withdrawals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id),
  amount          numeric(12,3) NOT NULL,
  bank_name       text NOT NULL,
  account_number  text NOT NULL,
  account_holder  text NOT NULL,
  iban            text,
  status          withdrawal_status NOT NULL DEFAULT 'pending',
  admin_notes     text,
  reviewed_by     uuid REFERENCES public.profiles(id),
  reviewed_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_withdrawals_user ON public.withdrawals(user_id);
CREATE INDEX idx_withdrawals_status ON public.withdrawals(status);
```

```sql
-- 00009_create_pages_cms.sql
-- NOTE: Payload CMS will create its own tables for Pages, Media, etc.
-- These are for reference / manual management outside Payload.

-- Menus
CREATE TABLE public.menus (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            jsonb NOT NULL DEFAULT '{}',         -- {"en": "Main Menu", "ar": "القائمة الرئيسية"}
  location        text NOT NULL,                       -- 'header', 'footer', 'sidebar', 'mobile'
  status          content_status NOT NULL DEFAULT 'active',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.menu_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id         uuid NOT NULL REFERENCES public.menus(id) ON DELETE CASCADE,
  parent_id       uuid REFERENCES public.menu_items(id) ON DELETE CASCADE,
  label           jsonb NOT NULL DEFAULT '{}',         -- {"en": "...", "ar": "..."}
  url             text NOT NULL,
  target          text DEFAULT '_self',                -- '_self' or '_blank'
  icon            text,
  sort_order      int NOT NULL DEFAULT 0,
  visibility      jsonb DEFAULT '["all"]',             -- ["all"] | ["customer", "merchant", "admin"]
  status          content_status NOT NULL DEFAULT 'active',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_menu_items_menu ON public.menu_items(menu_id);
CREATE INDEX idx_menu_items_parent ON public.menu_items(parent_id);

-- Widgets (homepage builder — Payload blocks will replace this over time)
CREATE TABLE public.widgets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug       text NOT NULL,                       -- 'home', 'about', etc.
  widget_type     text NOT NULL,                       -- 'sliders', 'latest-product', 'categories', etc.
  content         jsonb NOT NULL DEFAULT '{}',
  content_ar      jsonb DEFAULT '{}',                  -- Arabic version
  sort_order      int NOT NULL DEFAULT 0,
  status          content_status NOT NULL DEFAULT 'active',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_widgets_page ON public.widgets(page_slug);
```

```sql
-- 00010_create_blogs.sql

CREATE TABLE public.blog_categories (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text UNIQUE NOT NULL,
  name            jsonb NOT NULL DEFAULT '{}',         -- {"en": "...", "ar": "..."}
  description     jsonb DEFAULT '{}',
  status          content_status NOT NULL DEFAULT 'active',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.blogs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     uuid REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  author_id       uuid NOT NULL REFERENCES public.profiles(id),
  slug            text UNIQUE NOT NULL,

  title           jsonb NOT NULL DEFAULT '{}',         -- {"en": "...", "ar": "..."}
  excerpt         jsonb DEFAULT '{}',
  body            jsonb DEFAULT '{}',                  -- Rich text content
  feature_image   text,                                -- Storage path
  tags            text[],                              -- PostgreSQL array

  -- SEO
  meta_title      jsonb DEFAULT '{}',
  meta_description jsonb DEFAULT '{}',
  og_image        text,

  status          blog_status NOT NULL DEFAULT 'draft',
  published_at    timestamptz,
  scheduled_at    timestamptz,                         -- Future publish date
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_blogs_category ON public.blogs(category_id);
CREATE INDEX idx_blogs_author ON public.blogs(author_id);
CREATE INDEX idx_blogs_status ON public.blogs(status);
CREATE INDEX idx_blogs_slug ON public.blogs(slug);
CREATE INDEX idx_blogs_published ON public.blogs(published_at DESC);
CREATE INDEX idx_blogs_tags ON public.blogs USING GIN(tags);

CREATE TABLE public.blog_comments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id         uuid NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES public.profiles(id),
  author_name     text,
  author_email    text,
  comment         text NOT NULL,
  status          content_status NOT NULL DEFAULT 'active',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_blog_comments_blog ON public.blog_comments(blog_id);
```

```sql
-- 00011_create_support.sql

CREATE TABLE public.support_tickets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number   text UNIQUE NOT NULL,                -- TKT-0001
  user_id         uuid NOT NULL REFERENCES public.profiles(id),
  subject         text NOT NULL,
  description     text NOT NULL,
  department      text,
  priority        ticket_priority NOT NULL DEFAULT 'medium',
  status          ticket_status NOT NULL DEFAULT 'open',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz,
  closed_at       timestamptz
);

CREATE INDEX idx_tickets_user ON public.support_tickets(user_id);
CREATE INDEX idx_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_tickets_number ON public.support_tickets(ticket_number);

CREATE TABLE public.ticket_replies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id       uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES public.profiles(id),
  message         text NOT NULL,
  is_admin_reply  boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_replies_ticket ON public.ticket_replies(ticket_id);

CREATE TABLE public.ticket_attachments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id       uuid REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  reply_id        uuid REFERENCES public.ticket_replies(id) ON DELETE CASCADE,
  file_path       text NOT NULL,                       -- Storage path
  file_name       text NOT NULL,
  file_size       int,
  mime_type       text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
```

```sql
-- 00012_create_settings.sql

-- System settings (key-value)
CREATE TABLE public.settings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key             text UNIQUE NOT NULL,
  value           jsonb NOT NULL DEFAULT '{}',         -- Supports complex settings
  group_name      text DEFAULT 'general',              -- 'general', 'payment', 'email', 'seo', etc.
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_settings_key ON public.settings(key);
CREATE INDEX idx_settings_group ON public.settings(group_name);

-- Payment methods configuration
CREATE TABLE public.payment_methods (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  method_name     text NOT NULL,
  slug            text UNIQUE NOT NULL,
  credentials     jsonb DEFAULT '{}',                  -- Encrypted keys/secrets
  is_sandbox      boolean NOT NULL DEFAULT true,
  currency        text DEFAULT 'OMR',
  logo            text,
  extra_settings  jsonb DEFAULT '{}',
  status          content_status NOT NULL DEFAULT 'inactive',
  sort_order      int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Currencies
CREATE TABLE public.currencies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  symbol          text NOT NULL,
  code            text UNIQUE NOT NULL,                -- OMR, USD, etc.
  exchange_rate   numeric(12,6) NOT NULL DEFAULT 1.000000,
  is_default      boolean NOT NULL DEFAULT false,
  status          content_status NOT NULL DEFAULT 'active',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Email templates
CREATE TABLE public.email_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text UNIQUE NOT NULL,                -- 'bid_winner', 'deposit_confirm', etc.
  name            text NOT NULL,
  subject         jsonb NOT NULL DEFAULT '{}',         -- {"en": "...", "ar": "..."}
  body            jsonb NOT NULL DEFAULT '{}',         -- {"en": "<html>...", "ar": "<html>..."}
  variables       text[] DEFAULT '{}',                 -- Available shortcodes
  status          content_status NOT NULL DEFAULT 'active',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Watermarks
CREATE TABLE public.watermarks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image           text NOT NULL,                       -- Storage path
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Locations (hierarchical)
CREATE TABLE public.countries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            jsonb NOT NULL DEFAULT '{}',
  code            text UNIQUE NOT NULL,                -- OM, AE, etc.
  phone_code      text,
  status          content_status NOT NULL DEFAULT 'active'
);

CREATE TABLE public.states (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id      uuid NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  name            jsonb NOT NULL DEFAULT '{}',
  code            text,
  status          content_status NOT NULL DEFAULT 'active'
);

CREATE INDEX idx_states_country ON public.states(country_id);

CREATE TABLE public.cities (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id        uuid NOT NULL REFERENCES public.states(id) ON DELETE CASCADE,
  name            jsonb NOT NULL DEFAULT '{}',
  status          content_status NOT NULL DEFAULT 'active'
);

CREATE INDEX idx_cities_state ON public.cities(state_id);
```

```sql
-- 00013_create_notifications.sql

CREATE TABLE public.notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type            text NOT NULL,                       -- 'outbid', 'winner', 'deposit', 'system'
  title           jsonb NOT NULL DEFAULT '{}',         -- {"en": "...", "ar": "..."}
  body            jsonb NOT NULL DEFAULT '{}',
  data            jsonb DEFAULT '{}',                  -- Extra payload (product_id, order_id, etc.)
  is_read         boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);
```

```sql
-- 00014_create_audit_log.sql

CREATE TABLE public.audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES public.profiles(id),
  action          text NOT NULL,                       -- 'create', 'update', 'delete', 'login', 'bid_delete', etc.
  entity_type     text NOT NULL,                       -- 'product', 'order', 'user', 'bid', etc.
  entity_id       uuid,
  old_values      jsonb,
  new_values      jsonb,
  ip_address      inet,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_action ON public.audit_log(action);
CREATE INDEX idx_audit_created ON public.audit_log(created_at DESC);
```

```sql
-- Additional tables

-- Corporate domains (for corporate registration feature)
CREATE TABLE public.corporate_domains (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain          text UNIQUE NOT NULL,                -- 'petrooman.com'
  company_name    text NOT NULL,
  company_name_ar text,
  admin_user_id   uuid REFERENCES public.profiles(id),
  max_bid_limit   numeric(12,3),                       -- Per-employee bid cap
  is_verified     boolean NOT NULL DEFAULT false,
  status          content_status NOT NULL DEFAULT 'inactive',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Watchlist / Favorites
CREATE TABLE public.watchlist (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX idx_watchlist_user ON public.watchlist(user_id);

-- User payment info (saved bank details)
CREATE TABLE public.user_payment_info (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type            text NOT NULL,                       -- 'bank', 'paypal'
  bank_name       text,
  account_number  text,
  account_holder  text,
  iban            text,
  swift_code      text,
  paypal_email    text,
  is_default      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_info_user ON public.user_payment_info(user_id);

-- Contact form submissions
CREATE TABLE public.contacts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  email           text NOT NULL,
  phone           text,
  subject         text,
  message         text NOT NULL,
  is_read         boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Translations (key-value for static UI strings)
CREATE TABLE public.translations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lang            text NOT NULL,                       -- 'en', 'ar'
  key             text NOT NULL,
  value           text NOT NULL,
  UNIQUE(lang, key)
);

CREATE INDEX idx_translations_lang_key ON public.translations(lang, key);

-- Languages
CREATE TABLE public.languages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  code            text UNIQUE NOT NULL,                -- 'en', 'ar'
  direction       text NOT NULL DEFAULT 'ltr',         -- 'ltr' or 'rtl'
  is_default      boolean NOT NULL DEFAULT false,
  status          content_status NOT NULL DEFAULT 'active',
  created_at      timestamptz NOT NULL DEFAULT now()
);
```

### 6.3 — Database Functions & Triggers

```sql
-- 00016_create_functions.sql

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
-- (Generate triggers for each table)
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- ... apply to all tables with updated_at column

-- Generate custom ID (C0001, MC0001)
CREATE OR REPLACE FUNCTION generate_custom_id(role_prefix text)
RETURNS text AS $$
DECLARE
  next_num int;
  custom text;
BEGIN
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(custom_id FROM LENGTH(role_prefix) + 1) AS int)
  ), 0) + 1
  INTO next_num
  FROM public.profiles
  WHERE custom_id LIKE role_prefix || '%';

  custom := role_prefix || LPAD(next_num::text, 4, '0');
  RETURN custom;
END;
$$ LANGUAGE plpgsql;

-- Generate order number (MZD-2026-0001)
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text AS $$
DECLARE
  year_str text;
  next_num int;
BEGIN
  year_str := EXTRACT(YEAR FROM now())::text;
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(order_number, '-', 3) AS int)
  ), 0) + 1
  INTO next_num
  FROM public.orders
  WHERE order_number LIKE 'MZD-' || year_str || '-%';

  RETURN 'MZD-' || year_str || '-' || LPAD(next_num::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Update wallet balance (atomic)
CREATE OR REPLACE FUNCTION update_wallet_balance(
  p_user_id uuid,
  p_amount numeric,
  p_operation text  -- 'add' or 'subtract'
)
RETURNS numeric AS $$
DECLARE
  new_balance numeric;
BEGIN
  IF p_operation = 'add' THEN
    UPDATE public.profiles
    SET wallet_balance = wallet_balance + p_amount
    WHERE id = p_user_id
    RETURNING wallet_balance INTO new_balance;
  ELSIF p_operation = 'subtract' THEN
    UPDATE public.profiles
    SET wallet_balance = wallet_balance - p_amount
    WHERE id = p_user_id AND wallet_balance >= p_amount
    RETURNING wallet_balance INTO new_balance;

    IF new_balance IS NULL THEN
      RAISE EXCEPTION 'Insufficient wallet balance';
    END IF;
  END IF;

  RETURN new_balance;
END;
$$ LANGUAGE plpgsql;

-- Place bid (atomic — validates, inserts bid, updates product)
CREATE OR REPLACE FUNCTION place_bid(
  p_user_id uuid,
  p_product_id uuid,
  p_amount numeric
)
RETURNS jsonb AS $$
DECLARE
  v_product record;
  v_bid_id uuid;
  v_is_snipe boolean;
BEGIN
  -- Lock the product row
  SELECT * INTO v_product
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  -- Validations
  IF v_product IS NULL THEN
    RAISE EXCEPTION 'Product not found';
  END IF;
  IF v_product.status != 'published' THEN
    RAISE EXCEPTION 'Auction is not active';
  END IF;
  IF v_product.sale_type != 'auction' THEN
    RAISE EXCEPTION 'Product is not an auction';
  END IF;
  IF now() < v_product.start_date THEN
    RAISE EXCEPTION 'Auction has not started';
  END IF;
  IF now() > v_product.end_date THEN
    RAISE EXCEPTION 'Auction has ended';
  END IF;
  IF p_amount <= v_product.current_bid THEN
    RAISE EXCEPTION 'Bid must be higher than current bid';
  END IF;
  IF p_amount < v_product.min_bid_price AND v_product.bid_count = 0 THEN
    RAISE EXCEPTION 'Bid must be at least the minimum bid price';
  END IF;

  -- Insert bid
  INSERT INTO public.bid_history (user_id, product_id, merchant_id, amount)
  VALUES (p_user_id, p_product_id, v_product.merchant_id, p_amount)
  RETURNING id INTO v_bid_id;

  -- Update product
  UPDATE public.products
  SET current_bid = p_amount,
      bid_count = bid_count + 1,
      updated_at = now()
  WHERE id = p_product_id;

  -- Anti-snipe check (bid in last 2 minutes)
  v_is_snipe := (v_product.end_date - now()) < (v_product.snipe_extension_seconds || ' seconds')::interval;
  IF v_is_snipe AND v_product.total_extensions * v_product.snipe_extension_seconds < v_product.max_snipe_extension_minutes * 60 THEN
    UPDATE public.products
    SET end_date = end_date + (v_product.snipe_extension_seconds || ' seconds')::interval,
        total_extensions = total_extensions + 1
    WHERE id = p_product_id;
  END IF;

  RETURN jsonb_build_object(
    'bid_id', v_bid_id,
    'amount', p_amount,
    'is_snipe_extended', v_is_snipe,
    'new_end_date', (SELECT end_date FROM public.products WHERE id = p_product_id)
  );
END;
$$ LANGUAGE plpgsql;
```

---

## 7. ROW-LEVEL SECURITY (RLS) POLICIES

```sql
-- 00015_create_rls_policies.sql

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_payment_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: is admin or super_admin
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS boolean AS $$
  SELECT auth.user_role() IN ('admin', 'super_admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ═══════════════════════════════════════════
-- PROFILES
-- ═══════════════════════════════════════════
-- Anyone can read active profiles (public info like store owners)
CREATE POLICY profiles_select_public ON public.profiles
  FOR SELECT USING (deleted_at IS NULL);

-- Users can update their own profile
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can update any profile
CREATE POLICY profiles_update_admin ON public.profiles
  FOR UPDATE USING (auth.is_admin());

-- Admins can insert profiles (impersonation, corporate)
CREATE POLICY profiles_insert_admin ON public.profiles
  FOR INSERT WITH CHECK (auth.is_admin() OR auth.uid() = id);

-- ═══════════════════════════════════════════
-- PRODUCTS
-- ═══════════════════════════════════════════
-- Anyone can view published products
CREATE POLICY products_select_public ON public.products
  FOR SELECT USING (status = 'published' AND deleted_at IS NULL);

-- Merchants can view their own products (any status)
CREATE POLICY products_select_own ON public.products
  FOR SELECT USING (merchant_id = auth.uid());

-- Admins can view all products
CREATE POLICY products_select_admin ON public.products
  FOR SELECT USING (auth.is_admin());

-- Merchants can insert/update their own products
CREATE POLICY products_insert_merchant ON public.products
  FOR INSERT WITH CHECK (merchant_id = auth.uid() AND auth.user_role() = 'merchant');

CREATE POLICY products_update_merchant ON public.products
  FOR UPDATE USING (merchant_id = auth.uid())
  WITH CHECK (merchant_id = auth.uid());

-- Admins can do everything
CREATE POLICY products_all_admin ON public.products
  FOR ALL USING (auth.is_admin());

-- ═══════════════════════════════════════════
-- ORDERS
-- ═══════════════════════════════════════════
-- Users see their own orders
CREATE POLICY orders_select_own ON public.orders
  FOR SELECT USING (user_id = auth.uid());

-- Merchants see orders for their products
CREATE POLICY orders_select_merchant ON public.orders
  FOR SELECT USING (merchant_id = auth.uid());

-- Admins see all orders
CREATE POLICY orders_select_admin ON public.orders
  FOR SELECT USING (auth.is_admin());

-- Only system/admin can insert orders (through API service role)
CREATE POLICY orders_insert_admin ON public.orders
  FOR INSERT WITH CHECK (auth.is_admin());

-- ═══════════════════════════════════════════
-- BID HISTORY
-- ═══════════════════════════════════════════
-- Anyone can view bids on published products (privacy: names masked at app level)
CREATE POLICY bids_select_public ON public.bid_history
  FOR SELECT USING (deleted_at IS NULL);

-- Only service role can insert bids (via place_bid function)
CREATE POLICY bids_insert_service ON public.bid_history
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ═══════════════════════════════════════════
-- WALLET TRANSACTIONS
-- ═══════════════════════════════════════════
-- Users see their own transactions
CREATE POLICY wallet_select_own ON public.wallet_transactions
  FOR SELECT USING (user_id = auth.uid());

-- Admins see all
CREATE POLICY wallet_select_admin ON public.wallet_transactions
  FOR SELECT USING (auth.is_admin());

-- ═══════════════════════════════════════════
-- NOTIFICATIONS
-- ═══════════════════════════════════════════
-- Users see their own notifications only
CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- ═══════════════════════════════════════════
-- WATCHLIST
-- ═══════════════════════════════════════════
CREATE POLICY watchlist_all_own ON public.watchlist
  FOR ALL USING (user_id = auth.uid());

-- ═══════════════════════════════════════════
-- SUPPORT TICKETS
-- ═══════════════════════════════════════════
CREATE POLICY tickets_select_own ON public.support_tickets
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY tickets_select_admin ON public.support_tickets
  FOR SELECT USING (auth.is_admin());

CREATE POLICY tickets_insert_own ON public.support_tickets
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ═══════════════════════════════════════════
-- AUDIT LOG (admin only)
-- ═══════════════════════════════════════════
CREATE POLICY audit_select_admin ON public.audit_log
  FOR SELECT USING (auth.is_admin());

-- ═══════════════════════════════════════════
-- PUBLIC READ tables (categories, settings, currencies, languages, etc.)
-- ═══════════════════════════════════════════
CREATE POLICY categories_select_all ON public.categories FOR SELECT USING (true);
CREATE POLICY groups_select_all ON public.groups FOR SELECT USING (true);
CREATE POLICY stores_select_all ON public.stores FOR SELECT USING (true);
CREATE POLICY blogs_select_published ON public.blogs FOR SELECT USING (status = 'published');
CREATE POLICY blog_categories_select ON public.blog_categories FOR SELECT USING (true);
CREATE POLICY currencies_select ON public.currencies FOR SELECT USING (true);
CREATE POLICY languages_select ON public.languages FOR SELECT USING (true);
CREATE POLICY translations_select ON public.translations FOR SELECT USING (true);
CREATE POLICY menus_select ON public.menus FOR SELECT USING (true);
CREATE POLICY menu_items_select ON public.menu_items FOR SELECT USING (true);
CREATE POLICY widgets_select ON public.widgets FOR SELECT USING (true);
CREATE POLICY contacts_insert ON public.contacts FOR INSERT WITH CHECK (true);
CREATE POLICY settings_select ON public.settings FOR SELECT USING (true);
CREATE POLICY payment_methods_select ON public.payment_methods FOR SELECT USING (status = 'active');
```

> **Note:** The Express API uses a Supabase **service_role** key that bypasses RLS for admin operations. The web app uses the **anon** key which enforces RLS. This dual-key approach ensures security while giving the API full access for business logic.

---

## 8. SUPABASE STORAGE BUCKETS

```
Buckets to create:

1. avatars          — User profile images (public)
2. products         — Product feature images + gallery (public)
3. stores           — Store logos + cover images (public)
4. groups           — Group images (public)
5. categories       — Category images (public)
6. blogs            — Blog feature images (public)
7. watermarks       — Watermark overlay images (private, admin only)
8. documents        — Bank transfer proofs, ticket attachments (private)
9. invoices         — Generated PDF invoices/receipts (private, per-user)
10. media           — CMS media library (public)
```

**Storage policies:**
- Public buckets: Anyone can read, only authenticated users with appropriate role can upload
- Private buckets: Only the owning user + admins can read/write

---

## 9. ENVIRONMENT VARIABLES

```bash
# ═══════════════════════════════════════════
# .env.example — Root-level environment vars
# ═══════════════════════════════════════════

# ── Supabase ──
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxx
DATABASE_URL=postgresql://postgres:[password]@db.xxxx.supabase.co:5432/postgres

# ── Apps ──
NEXT_PUBLIC_WEB_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:8080

# ── Payload CMS ──
PAYLOAD_SECRET_EXPRESS=your-payload-secret-key-min-32-chars

# ── Supabase Storage (S3-compatible for Payload) ──
SUPABASE_STORAGE_ENDPOINT=https://xxxx.supabase.co/storage/v1/s3
SUPABASE_STORAGE_BUCKET=media
SUPABASE_STORAGE_KEY=your-storage-access-key
SUPABASE_STORAGE_SECRET=your-storage-secret-key
SUPABASE_STORAGE_REGION=us-east-1

# ── Auth (Supabase handles this, but configure providers) ──
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
APPLE_CLIENT_ID=
APPLE_CLIENT_SECRET=

# ── Payment Gateways ──
STRIPE_PUBLIC_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=

# ── Email (Resend) ──
RESEND_API_KEY=re_xxxx
EMAIL_FROM=noreply@mzadat.om

# ── Error Monitoring ──
SENTRY_DSN=https://xxxx@sentry.io/xxxx
NEXT_PUBLIC_SENTRY_DSN=https://xxxx@sentry.io/xxxx

# ── reCAPTCHA ──
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
RECAPTCHA_SECRET_KEY=

# ── API ──
API_PORT=4000
JWT_SECRET=matches-supabase-jwt-secret
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# ── Timezone ──
TZ=Asia/Muscat
```

---

## 10. SETUP INSTRUCTIONS

### Prerequisites

- Node.js 20 LTS
- pnpm 9.x (`npm install -g pnpm`)
- Supabase CLI (`brew install supabase/tap/supabase`)
- Docker (for Supabase local dev)

### Step-by-Step

```bash
# 1. Clone & install
git clone <repo-url> mzadat
cd mzadat
pnpm install

# 2. Copy environment variables
cp .env.example .env

# 3. Start Supabase locally
supabase start
# → Note the API URL, anon key, and service_role key
# → Update .env with local Supabase credentials

# 4. Run database migrations
supabase db push
# Or: apply migrations one by one
supabase migration up

# 5. Generate TypeScript types from database
pnpm --filter @mzadat/db run generate
# Runs: supabase gen types typescript --local > packages/db/src/types.ts

# 6. Seed development data (optional)
pnpm run seed

# 7. Start all apps in development
pnpm dev
# → web:   http://localhost:3000
# → admin: http://localhost:3001
# → api:   http://localhost:8080

# Or start individually:
pnpm --filter web dev
pnpm --filter admin dev
pnpm --filter api dev
```

### Root `package.json` Scripts

```json
{
  "name": "mzadat",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "test": "turbo test",
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\"",
    "db:generate": "supabase gen types typescript --local > packages/db/src/types.ts",
    "db:push": "supabase db push",
    "db:reset": "supabase db reset",
    "db:seed": "tsx scripts/seed-dev-data.ts",
    "db:migrate": "supabase migration up",
    "clean": "turbo clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "latest",
    "prettier": "latest",
    "tsx": "latest"
  },
  "packageManager": "pnpm@9.15.0"
}
```

### `pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

---

## 11. DATA MIGRATION (MySQL → Supabase)

### Migration Script: `scripts/migrate-mysql-to-supabase.ts`

```
Source: mzadat_mzadat.sql (MySQL dump — 51 tables)
Target: Supabase PostgreSQL (new schema above)

Key Transformations:
─────────────────────────────────────────────────────────

1. USERS (490 rows)
   MySQL: users.id (bigint auto_increment)
   PG:    profiles.id (uuid, linked to auth.users)
   - Create auth.users entry for each user (email + hashed password)
   - Map role: 1→'customer', 2→'merchant', 3→'admin', 4→'super_admin'
   - Map status: 1→'active', 2→'inactive'
   - Map register_as: 1→'individual', 2→'company'
   - Combine fname/lname → first_name/last_name
   - Combine fname_om/lname_om → first_name_ar/last_name_ar
   - Convert wallet_balance from double → numeric(12,3)
   - Preserve custom_id (C0001, MC0001)

2. STORES (48 rows)
   MySQL: stores (3 name columns: name, name_en, name_om)
   PG:    stores.name = {"en": name_en, "ar": name_om}
   - Map author_id → owner_id (lookup UUID from old int ID)
   - Social links → jsonb object

3. CATEGORIES
   MySQL: categories + category_translations
   PG:    categories.name = {"en": <from translation lang=en>, "ar": <from translation lang=om>}

4. PRODUCTS (543 rows)
   MySQL: products + product_translations
   PG:    products with jsonb name/description
   - Map sale_type: 1→'auction', 2→'direct'
   - Map status: 1→'published', 2→'draft', 3→'pending', 4→'inactive'
   - Map min_deposit_type: 1→'percentage', 2→'fixed'
   - Convert all double prices → numeric(12,3)
   - Map add_balance_one/two/three/four → bid_increment_1/2/3/4
   - Map author_id → merchant_id
   - Merge translations into jsonb

5. GROUPS (85 rows)
   MySQL: groups (name_en, name_om separate columns)
   PG:    groups.name = {"en": name_en, "ar": name_om}
   - Map status based on dates

6. ORDERS (2,785 rows)
   MySQL: orders.type: 2→'bid', 3→'purchase'
   MySQL: orders.status: 1→'processing', 2→'win', 3→'rejected', etc.
   MySQL: orders.payment_status: 1→'partial', 2→'unpaid', 3→'paid'
   - Generate proper order_number from existing order_number field
   - Convert all double amounts → numeric(12,3)

7. BID_HISTORY (19,662 rows)
   - Straight mapping with UUID conversion
   - Preserve soft delete (deleted_at)

8. WALLETS (2,692 rows → wallet_transactions)
   MySQL: wallets.type: 1→'deposit', 2→'bid', 3→'purchase', 4→'withdraw',
                         5→'return', 6→'refund', 7→'bid_final_payment'
   MySQL: wallets.status: 1→'pending', 2→'completed', 3→'rejected'
   - Convert all double amounts → numeric(12,3)

9. TRANSLATIONS (2,062 rows)
   - Direct mapping: lang, key, value

10. EMAIL_TEMPLATES (18 rows)
    MySQL: separate rows per template
    PG:    slug, subject (jsonb), body (jsonb)

11. SETTINGS
    MySQL: key-value text
    PG:    key + jsonb value

12. SUPPORT_TICKETS + TICKET_REPLIES + ATTACHMENTS
    - Straight mapping with UUID conversion

13. BLOGS + BLOG_CATEGORIES + COMMENTS
    MySQL: blogs + blog_translations + blog_category_translations
    PG:    blogs.title/body = jsonb with translations merged

14. PAGES + WIDGETS + WIDGET_CONTENTS
    - Migrate to Payload CMS format or keep as widgets table
    - Transform widget_content JSON to match new widget schema

15. PAYMENT_METHODS
    - Preserve credentials as jsonb
    - Map status: 1→'active', 2→'inactive'

16. FILES / MEDIA
    - Copy all files from /uploads/* to Supabase Storage buckets
    - Update all file path references in database

ID Mapping Strategy:
━━━━━━━━━━━━━━━━━━━
- Create a temporary id_map table: old_table, old_id (int), new_id (uuid)
- Process tables in dependency order
- After migration, verify FK integrity
- Run reconciliation: count records per table, compare totals, verify wallet balances sum

Estimated Migration Time: ~5 minutes for data, ~30 minutes for file upload
```

---

## 12. KEY BUSINESS LOGIC REFERENCE

### User Roles & Permissions Matrix

| Action | Customer | Merchant | Admin | SuperAdmin |
|--------|----------|----------|-------|------------|
| Browse auctions | ✓ | ✓ | ✓ | ✓ |
| Place bids | ✓ | ✗ | ✗ | ✗ |
| Create products | ✗ | ✓ | ✓ | ✓ |
| Manage store | ✗ | ✓ | ✓ | ✓ |
| Manage users | ✗ | ✗ | ✓ | ✓ |
| System settings | ✗ | ✗ | ✗ | ✓ |
| View all data | ✗ | ✗ | ✓ | ✓ |
| Delete data | ✗ | ✗ | ✗ | ✓ |
| Login as user | ✗ | ✗ | ✓ | ✓ |

### Auction Lifecycle

```
[Draft] → [Pending] → [Published] → [Live Auction] → [Auction Ended] → [Winner Declared]
                                     ↕ Anti-Snipe      ↕ Auto-close     ↕ Payment
                                     +2min extension    by cron job      → Settlement
                                     (max 30min total)                   → Refund losers
```

### Bid Flow

1. User registers for auction by paying deposit (deducted from wallet)
2. User places bid (must be > current_bid + increment)
3. If bid in last 2 minutes → extend end_date by 2 minutes (anti-snipe, max 30 min total)
4. On auction end → highest bidder wins
5. Winner must pay: (winning_bid − deposit) + commission + VAT within 3 business days
6. Non-winners: deposit returned to wallet
7. If winner doesn't pay → deposit forfeited, next highest bidder wins

### Wallet Transaction Types

| Type | Direction | Description |
|------|-----------|-------------|
| `deposit` | IN | User adds funds (gateway or bank transfer) |
| `bid` | OUT | Deposit deducted to enter auction |
| `purchase` | OUT | Direct purchase payment |
| `withdraw` | OUT | User withdraws to bank |
| `return` | IN | Non-winner deposit returned |
| `refund` | IN | Admin-initiated refund |
| `bid_final_payment` | OUT | Winner pays remaining amount |
| `admin_adjustment` | IN/OUT | Admin manually adjusts balance |
| `commission` | IN | Commission credited to merchant |

### Commission Calculation

```
winning_bid = 100.000 OMR
commission_rate = 5% (per-merchant configurable)
vat_rate = 5% (if applicable for merchant)

commission = winning_bid × commission_rate = 5.000 OMR
vat = commission × vat_rate = 0.250 OMR (only if merchant has VAT)
merchant_receives = winning_bid − commission = 95.000 OMR
platform_receives = commission + vat = 5.250 OMR

Winner pays: winning_bid + buyer_commission (brokerage, if any) + VAT
```

### Anti-Snipe Rules

```
snipe_window = 120 seconds (2 minutes)
snipe_extension = 120 seconds (2 minutes)
max_total_extension = 1800 seconds (30 minutes)

IF bid_placed AND (end_date - now) < snipe_window:
  IF total_extensions * snipe_extension < max_total_extension:
    end_date += snipe_extension
    total_extensions += 1
```

### Custom ID Generation

```
Customer:    C0001, C0002, C0003 ...
Merchant:    MC0001, MC0002, MC0003 ...
Admin:       A0001, A0002 ...
Order:       MZD-2026-0001, MZD-2026-0002 ...
Ticket:      TKT-0001, TKT-0002 ...
```

### Currency Format

```
Currency: OMR (Omani Rial)
Decimal places: 3 (not 2)
Format: 1,234.567 OMR
In Arabic context: use LTR unicode marks around numbers
Storage: numeric(12,3) — supports up to 999,999,999.999
```

---

## QUICK REFERENCE — TABLE COUNT

| Table | Description | Migrated Rows |
|-------|-------------|:------------:|
| profiles | User accounts | 490 |
| stores | Merchant stores | 48 |
| categories | Product categories | ~20 |
| products | Auction/direct sale listings | 543 |
| product_galleries | Product images | ~2,000 |
| product_specifications | Product specs | ~1,000 |
| product_reviews | Customer reviews | ~50 |
| groups | Auction groups/lots | 85 |
| orders | Bid orders + purchases | 2,785 |
| bid_history | All bids placed | 19,662 |
| wallet_transactions | All wallet movements | 2,692 |
| bank_deposits | Bank transfer proofs | ~100 |
| withdrawals | Withdrawal requests | ~50 |
| blogs | Blog posts | ~20 |
| blog_categories | Blog categories | ~10 |
| blog_comments | Blog comments | ~30 |
| support_tickets | Support tickets | ~50 |
| ticket_replies | Ticket thread messages | ~100 |
| email_templates | Email templates | 18 |
| settings | System config | ~50 |
| payment_methods | Gateway configs | ~5 |
| currencies | Currency definitions | ~3 |
| translations | UI string translations | 2,062 |
| languages | Language definitions | 2 |
| menus | Navigation menus | ~5 |
| menu_items | Menu links | ~30 |
| widgets | Homepage widgets | ~40 |
| contacts | Contact form submissions | ~100 |
| watermarks | Watermark images | 1 |
| countries/states/cities | Location hierarchy | ~500 |
| notifications | (NEW — empty at migration) | 0 |
| audit_log | (NEW — empty at migration) | 0 |
| watchlist | (NEW — empty at migration) | 0 |
| corporate_domains | (NEW — empty at migration) | 0 |
| deleted_bid_log | (NEW — empty at migration) | 0 |

---

*Generated: March 2026 | Mzadat Platform Rebuild*
