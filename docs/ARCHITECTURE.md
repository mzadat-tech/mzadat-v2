# Mzadat v2 — Architecture

## Overview

Mzadat is a bilingual (Arabic/English) auction platform for the Omani market. The platform is built as a **Turborepo monorepo** with clear separation of concerns.

## Monorepo Structure

```
mzadat-v2/
├── apps/
│   ├── web/          → Public website + merchant panel (Next.js 16)
│   ├── admin/        → Admin dashboard + CMS (Next.js 16 + Payload CMS 3)
│   └── api/          → REST API + WebSocket (Express 5)
├── packages/
│   ├── db/           → Prisma schema, client, types, enums
│   ├── ui/           → Shared React component library (shadcn/ui)
│   ├── validators/   → Zod validation schemas
│   ├── config/       → Constants, permissions, feature flags
│   ├── email/        → React Email templates
│   └── tsconfig/     → Shared TypeScript configs
├── scripts/          → Migration, seeding, type generation utilities
└── docs/             → This documentation
```

## Tech Stack

| Layer          | Technology                        |
|----------------|-----------------------------------|
| Frontend       | Next.js 16, React 19, Tailwind v4 |
| Admin CMS      | Payload CMS 3.0                   |
| API            | Express.js 5, WebSocket (ws)      |
| Database       | PostgreSQL (Supabase)             |
| ORM            | Prisma 6.4+                       |
| Auth           | Supabase Auth (SSR)               |
| Storage        | Supabase Storage (S3-compatible)  |
| Realtime       | Supabase Realtime + WebSocket     |
| Validation     | Zod                               |
| Email          | React Email + Resend              |
| Error Tracking | Sentry                            |
| CI/CD          | GitHub Actions                    |

## Key Architectural Decisions

### 1. Prisma over raw SQL migrations
We use Prisma for schema management instead of Supabase SQL migrations. This gives us:
- Type-safe database queries
- Controlled migration history
- Easy rollbacks
- Schema visualization

### 2. Bilingual JSON fields
All user-facing text fields store bilingual content as JSONB:
```json
{ "en": "Electronics", "ar": "إلكترونيات" }
```

### 3. Custom ID system
Entities use UUID primary keys internally but human-readable IDs for display:
- Customers: `C1234`
- Merchants: `MC1234`
- Auctions: `A1234`
- Orders: `MZD20240101-001`
- Tickets: `TKT1234`

### 4. Money handling
All monetary values use `Decimal(12,3)` for OMR (3 decimal places). Never use floating point for money.

### 5. Role-based access
Six roles with granular permissions:
- `SUPER_ADMIN` — Full access
- `ADMIN` — Management without system settings
- `MODERATOR` — Content moderation
- `MERCHANT` — Sell products, manage store
- `VIP` — Enhanced bidding privileges
- `USER` — Standard bidder

## Data Flow

```
Browser ──→ Next.js (SSR) ──→ API (Express) ──→ Prisma ──→ PostgreSQL
                │                    │
                │                    ├──→ Supabase Auth
                │                    ├──→ Supabase Storage
                │                    └──→ Supabase Realtime
                │
                └──→ Supabase (client-side auth, realtime subscriptions)
```

## Environment Configuration

See `.env.example` for all required environment variables. Key groups:
- **Database**: `DATABASE_URL`, `DIRECT_URL`
- **Supabase**: `NEXT_PUBLIC_SUPABASE_URL`, keys
- **Payload**: `PAYLOAD_SECRET`
- **Payment**: Thawani API keys
- **Email**: Resend API key
- **Storage**: S3-compatible config (Supabase Storage)
