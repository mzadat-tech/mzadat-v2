# Zero-Error Migration Plan: MySQL → Supabase

## Architecture

```
┌──────────────┐    ┌────────────────────┐    ┌──────────────────┐
│ Legacy MySQL │───▶│  Migration Engine   │───▶│ Supabase Postgres│
│  (51 tables) │    │  (TypeScript/Prisma)│    │  (Prisma schema) │
└──────────────┘    └────────────────────┘    └──────────────────┘
                           │                          │
                    ┌──────▼──────┐            ┌──────▼──────┐
                    │  ID Map DB  │            │  Supabase   │
                    │ (old→new)   │            │  Storage    │
                    └─────────────┘            └─────────────┘
```

## The 3 Core Challenges

| Challenge | Problem | Solution |
|-----------|---------|----------|
| **ID System** | Legacy uses `bigint AUTO_INCREMENT`, new uses `UUID` | Deterministic UUID generation: `uuid5(namespace, "table:old_id")` — same input always produces same UUID, and maintain a `_migration_id_map` table |
| **Translations** | 9 separate `*_translations` tables | Merge into JSONB columns `{"en": "...", "ar": "..."}` |
| **File uploads** | Laravel `uploads/` folder on disk | Migrate to Supabase Storage S3 bucket |

---

## Migration Phases (Execute In Order)

### Phase 0 — Pre-flight Checks

- Snapshot the live MySQL database (`mysqldump --single-transaction`)
- Create a `_migration_id_map(legacy_table, legacy_id, new_uuid)` table in Supabase
- Set the site to **maintenance mode** during migration
- Disable triggers/webhooks on Supabase temporarily

### Phase 1 — Reference Data (no FK dependencies)

```
countries → Country
states → State  (FK: country_id)
cities → City   (FK: state_id)
currencies → Currency
corporate_domains → CorporateDomain
```

### Phase 2 — Users & Identity

```
users + user_translations → Profile
  - Merge user_translations into JSONB
  - Map role: 1=customer, 2=merchant, 3=admin, 4=super_admin
  - Map status ints to enum strings
  - wallet_balance copied, will be VERIFIED in Phase 6
```

### Phase 3 — Commerce Structure

```
categories + category_translations → Category  (FK: parent_id self-ref)
groups + group_translations → Group
stores → Store  (FK: user_id→Profile)
```

### Phase 4 — Products & Bids (heaviest tables)

```
products + product_translations → Product  (FK: merchant_id, category_id, group_id)
product_galleries → ProductGallery  (FK: product_id) + upload files to S3
product_reviews → ProductReview  (FK: product_id, user_id)
bid_history → BidHistory  (FK: product_id, user_id, merchant_id)
deleted_bids → DeletedBidLog
```

### Phase 5 — Financial Data (CRITICAL — requires exact precision)

```
orders → Order  (FK: user_id, merchant_id, product_id)
wallet_transactions → WalletTransaction  (FK: user_id)
bank_deposites → BankDeposit  (FK: user_id)
withdrawals → Withdrawal  (FK: user_id)
```

### Phase 6 — Support & Notifications

```
support_tickets → SupportTicket  (FK: user_id)
ticket_replies → TicketReply  (FK: ticket_id, user_id)
ticket_attachments → TicketAttachment  (FK: reply_id)
notifications → Notification  (FK: user_id)
watchlist → Watchlist  (FK: user_id, product_id)
```

### Phase 7 — CMS Content (into Payload CMS tables — separate migration)

```
menus/menu_items → Payload `menus` collection
widgets → Payload `widgets` collection
blogs/blog_categories/comments → Payload blog collections
settings → Payload `site-settings` global
email_templates → Payload `email-templates` collection
```

### Phase 8 — Skipped Tables

```
Laravel framework tables (DROP): migrations, password_resets, failed_jobs,
  personal_access_tokens, jobs
payment_gateways → Re-configure fresh (credentials can't be migrated)
```

---

## Zero-Error Safeguards

1. **Checksum verification** — After each phase, compare `COUNT(*)` and `SUM(amount)` between MySQL and Supabase
2. **Wallet balance reconciliation** — Sum all `wallet_transactions` per user, compare against `profile.wallet_balance`
3. **Referential integrity check** — Query for orphaned foreign keys after each phase
4. **Idempotent upserts** — Use `prisma.*.upsert()` so the script can be re-run safely
5. **Transaction wrapping** — Each phase runs inside a DB transaction; rollback on any error
6. **Dry-run mode** — Run the full script against a staging Supabase first, validate, then run on production
7. **Audit log** — Log every row migrated with old ID → new UUID mapping

---

## File Upload Migration

```
Legacy: /mzadat-legacy/uploads/{images,documents}
Target: Supabase Storage bucket (same one Payload uses)

Strategy:
  1. List all files referenced in DB (product_galleries.image, bank_deposites.image, etc.)
  2. Upload each to Supabase Storage via S3 API
  3. Update the new DB records with the Supabase Storage URL
  4. Verify file count matches
```

---

## Estimated Execution

Based on the SQL dump data volumes:

- ~500 users, ~550 bank deposits, moderate product/bid data
- Total migration time: **15–30 minutes** for data, **1–2 hours** for file uploads
- Recommended maintenance window: **4 hours** (including verification)

---

## Migration Scripts Structure

```
scripts/
  migrate/
    00-preflight.ts        # Validate connections, create id_map table
    01-reference-data.ts   # Countries, states, cities, currencies
    02-users.ts            # Users + translations → Profile
    03-commerce.ts         # Categories, groups, stores
    04-products.ts         # Products, galleries, specs, reviews, bids
    05-financials.ts       # Orders, wallets, deposits, withdrawals
    06-support.ts          # Tickets, notifications, watchlists
    07-cms-to-payload.ts   # Menus, blogs, settings → Payload tables
    08-upload-files.ts     # Bulk upload to Supabase Storage
    09-verify.ts           # Full checksum + reconciliation report
    run-all.ts             # Orchestrator with phase tracking
    id-map.ts              # UUID generation + mapping utilities
    helpers.ts             # Status mappers, type converters
```
