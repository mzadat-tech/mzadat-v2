# Mzadat v2 — Deployment Guide

## Prerequisites

- Node.js 20 LTS
- pnpm 9.x (`corepack enable && corepack prepare pnpm@latest --activate`)
- Docker (optional, for local PostgreSQL)
- Supabase project (production)

## Local Development

### 1. Clone & Install

```bash
git clone <repo-url> mzadat-v2
cd mzadat-v2
pnpm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your Supabase credentials and other config
```

### 3. Database Setup

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate:dev

# Seed base data (languages, currency, countries)
pnpm db:seed

# (Optional) Seed development test data
pnpm tsx scripts/seed-dev-data.ts
```

### 4. Start Development

```bash
# Start all apps in development mode
pnpm dev

# Or start individual apps
pnpm --filter web dev          # http://localhost:3000
pnpm --filter admin dev        # http://localhost:3001
pnpm --filter api dev          # http://localhost:8080
```

### 5. Prisma Studio

```bash
pnpm db:studio    # Opens at http://localhost:5555
```

## Database Migrations

### Creating a new migration

```bash
# After modifying packages/db/prisma/schema.prisma:
pnpm db:migrate:dev -- --name <migration_name>

# Examples:
pnpm db:migrate:dev -- --name add_user_preferences
pnpm db:migrate:dev -- --name create_notifications_table
```

### Deploying migrations (staging/production)

```bash
pnpm db:migrate:deploy
```

### Reset database (development only!)

```bash
pnpm db:reset
```

## Build

```bash
# Build all apps
pnpm build

# Build specific app
pnpm --filter web build
pnpm --filter admin build
pnpm --filter api build
```

## Production Deployment

### Option A: Vercel (web + admin)

1. Connect repo to Vercel
2. Set root directory to `apps/web` or `apps/admin`
3. Set build command: `cd ../.. && pnpm turbo build --filter=web`
4. Set output directory: `apps/web/.next`
5. Add all environment variables from `.env.example`

### Option B: Railway / Render (API)

1. Connect repo
2. Set build command: `pnpm install && pnpm build --filter=api`
3. Set start command: `node apps/api/dist/index.js`
4. Set `PORT` environment variable
5. Add all environment variables

### Option C: Docker

```dockerfile
# Dockerfile.api
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

RUN pnpm install --frozen-lockfile
RUN pnpm db:generate
RUN pnpm --filter api build

CMD ["node", "apps/api/dist/index.js"]
```

## Environment Variables

### Required for all environments

| Variable                          | Description                    |
|-----------------------------------|--------------------------------|
| `DATABASE_URL`                    | Prisma connection (pooled)      |
| `DIRECT_URL`                      | Prisma direct connection        |
| `NEXT_PUBLIC_SUPABASE_URL`        | Supabase project URL           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Supabase anon/public key       |
| `SUPABASE_SERVICE_ROLE_KEY`       | Supabase service role key      |

### App-specific

| Variable                  | App    | Description                    |
|---------------------------|--------|--------------------------------|
| `PAYLOAD_SECRET`          | admin  | Payload CMS encryption secret  |
| `API_PORT`                | api    | Express port (default: 4000)   |
| `THAWANI_API_KEY`         | api    | Thawani payment gateway key    |
| `THAWANI_SECRET_KEY`      | api    | Thawani secret key             |
| `RESEND_API_KEY`          | api    | Resend email API key           |
| `SENTRY_DSN`              | all    | Sentry error tracking          |

## Monitoring

- **Sentry**: Error tracking for all apps
- **Supabase Dashboard**: Database metrics, auth logs, storage usage
- **Prisma Studio**: Database browser (dev only)
- **Health endpoint**: `GET /api/v1/health`

## Troubleshooting

### Prisma generate fails
```bash
pnpm --filter @mzadat/db exec prisma generate
```

### Migration conflicts
```bash
# Reset migration history (dev only)
pnpm db:migrate:dev -- --create-only
# Then manually edit the migration SQL if needed
```

### Port conflicts
Check if ports 3000, 3001, or 4000 are in use:
```bash
lsof -i :3000
lsof -i :3001
lsof -i :4000
```
