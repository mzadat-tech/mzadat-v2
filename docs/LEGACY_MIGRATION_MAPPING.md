# Legacy Migration Mapping: MySQL → Supabase (v2)

> Reference document for migrating data from the legacy Laravel/MySQL system to the v2 Next.js/Supabase stack.

---

## Table of Contents

1. [ID Strategy](#id-strategy)
2. [Legacy Table Schemas](#legacy-table-schemas)
3. [V2 Table Schemas](#v2-table-schemas)
4. [Status Value Mapping](#status-value-mapping)
5. [Key Structural Differences](#key-structural-differences)
6. [Legacy ID Generation Patterns](#legacy-id-generation-patterns)
7. [Migration Script Status](#migration-script-status)

---

## ID Strategy

| Aspect | Legacy (MySQL) | V2 (Supabase/PostgreSQL) |
|---|---|---|
| **Primary keys** | `bigint unsigned AUTO_INCREMENT` | `UUID` via `gen_random_uuid()` |
| **Wallet transaction IDs** | `Str::random(20)` — 20-char base62 alphanumeric | `WTX-YYYY-NNNNNN` sequential reference numbers |
| **Order numbers** | `strtoupper(Str::random(7))` — 7-char uppercase alphanumeric | `MZD-YYYY-NNNN` structured format |
| **User IDs** | Auto-increment integers | UUID linked to `auth.users` |

### Migration Approach

- Generate fresh UUIDs for all v2 primary keys
- Generate fresh `WTX-*` / `MZD-*` reference numbers for v2
- Preserve legacy integer IDs in a mapping table during migration for cross-referencing
- Preserve legacy `transaction_id` (20-char random) in the v2 `transactionId` column as a historical reference
- Build a `legacy_id → new_uuid` lookup for each entity type to resolve foreign key relationships

---

## Legacy Table Schemas

All legacy tables use `bigint unsigned AUTO_INCREMENT` primary keys.

### `users`

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint unsigned AI` | PK |
| `custom_id` | `varchar(255)` | nullable |
| `fname` | `varchar(255)` | nullable |
| `lname` | `varchar(255)` | nullable |
| `fname_om` | `varchar(255)` | nullable — Arabic first name |
| `lname_om` | `varchar(255)` | nullable — Arabic last name |
| `username` | `varchar(255)` | unique |
| `email` | `varchar(255)` | unique |
| `email_verified_at` | `timestamp` | nullable |
| `verify_token` | `text` | nullable |
| `password` | `varchar(255)` | bcrypt hash |
| `individual_id` | `varchar(255)` | nullable |
| `phone` | `varchar(255)` | nullable |
| `address` | `varchar(255)` | nullable |
| `country_id` | `varchar(255)` | nullable — string, NOT a FK |
| `state_id` | `varchar(255)` | nullable — string, NOT a FK |
| `city_id` | `varchar(255)` | nullable — string, NOT a FK |
| `zip_code` | `varchar(255)` | nullable |
| `image` | `varchar(255)` | nullable |
| `role` | `int` | default 1. **1=Customer, 2=Merchant, 3=Admin, 4=SuperAdmin** |
| `status` | `int` | default 1. **1=Active, 2=Inactive** |
| `admin_commission` | `varchar(255)` | nullable |
| `vat_applicable` | `tinyint(1)` | default false |
| `wallet_balance` | `double(10,2)` | default 0.00 |
| `remember_token` | `varchar(100)` | |
| `created_at` / `updated_at` | `timestamp` | |

### `wallets`

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint unsigned AI` | PK |
| `user_id` | `bigint unsigned` | FK → users(id) CASCADE |
| `order_id` | `bigint` | nullable |
| `payer_id` | `varchar(255)` | nullable — `Str::random(20)` |
| `payer_email` | `varchar(255)` | nullable |
| `type` | `int` | default 1. **1=Deposit, 2=Bid, 3=Purchase, 4=Withdraw, 5=Return, 6=Refund, 7=Bid Final Payment** |
| `amount` | `double(10,2)` | nullable |
| `admin_commission_rate` | `int` | nullable |
| `admin_commission` | `double(10,2)` | nullable |
| `merchant_amount` | `double(10,2)` | nullable |
| `tax_amount` | `double(10,2)` | nullable |
| `total_amount` | `double(10,2)` | nullable |
| `payment_method` | `varchar(255)` | nullable |
| `transaction_id` | `text` | nullable — `Str::random(20)` |
| `currency` | `varchar(255)` | nullable |
| `gateway_amount` | `double(10,2)` | nullable |
| `payment_details` | `text` | nullable |
| `status` | `int` | default 1. **1=Processing, 2=Completed, 3=Cancel** |
| `created_at` / `updated_at` | `timestamp` | |

### `bank_deposites` (note: typo in table name is intentional in legacy)

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint unsigned AI` | PK |
| `user_id` | `int` | NOT a FK constraint |
| `ammount` | `int` | (typo: "ammount") |
| `image` | `varchar(191)` | nullable — proof document |
| `status` | `int` | default 0 |
| `payment_method` | `varchar(255)` | nullable |
| `transection_id` | `varchar(300)` | (typo: "transection") — `Str::random(20)` |
| `created_at` / `updated_at` | `timestamp` | nullable |
| `deleted_at` | `timestamp` | nullable — soft deletes |

### `products`

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint unsigned AI` | PK |
| `name` | `varchar(255)` | |
| `slug` | `mediumText` | |
| `sku` | `varchar(255)` | nullable |
| `meta_title` | `varchar(255)` | nullable |
| `meta_keyward` | `longText` | nullable (typo: "keyward") |
| `meta_description` | `text` | nullable |
| `author_id` | `bigint unsigned` | FK → users(id) CASCADE |
| `short_desc` | `text` | nullable |
| `long_desc` | `longText` | nullable |
| `category_id` | `bigint unsigned` | FK → categories(id) CASCADE |
| `features_image` | `text` | nullable |
| `sale_type` | `int` | **1=Auction, 2=Direct** |
| `schedule_type` | `int` | **1=Yes(Scheduled), 2=No(Default)** |
| `min_deposit` | `varchar(255)` | nullable |
| `min_deposit_type` | `int` | **1=Percent, 2=Fixed** |
| `quantity` | `int` | default 1 |
| `price` | `double(10,2)` | nullable |
| `sale_price` | `double(10,2)` | nullable |
| `min_bid_price` | `double(10,2)` | nullable |
| `start_date` / `end_date` | `timestamp` | nullable |
| `status` | `int` | **1=Published, 2=Draft, 3=Pending, 4=Inactive** |
| `group_id` | `bigint unsigned` | default 1 |
| `location` | `varchar(255)` | nullable |
| `created_at` / `updated_at` | `timestamp` | |

### `orders`

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint unsigned AI` | PK |
| `order_number` | `varchar(255)` | `strtoupper(Str::random(7))` |
| `product_id` | `bigint unsigned` | FK → products(id) CASCADE |
| `user_id` | `bigint unsigned` | FK → users(id) CASCADE |
| `type` | `int` | **2=Bid, 3=Purchase** |
| `bid_amount` | `double(20,2)` | nullable |
| `amount` | `double(10,2)` | nullable |
| `tax_amount` | `double(10,2)` | nullable |
| `quantity` | `int` | nullable |
| `billing_*` / `shipping_*` | various | Address snapshot fields |
| `merchant_id` | `int` | nullable |
| `status` | `int` | **1=Processing, 2=Win, 3=Reject, 4=Completed, 5=On Hold, 6=Delivered, 7=Refunded, 8=Shipped** |
| `payment_status` | `int` | **1=Partials, 2=Unpaid, 3=Paid** |
| `view` | `int` | default 0 |
| `win_status` | `int` | default 0 |
| `is_restricted` | `tinyint(1)` | default false |
| `created_at` / `updated_at` | `timestamp` | |

### `categories`

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint unsigned AI` | PK |
| `name` | `varchar(255)` | |
| `slug` | `mediumText` | |
| `image` | `varchar(255)` | nullable |
| `status` | `int` | **1=Active, 2=Inactive** |
| `created_at` / `updated_at` | `timestamp` | |

### `bid_history`

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint unsigned AI` | PK |
| `order_number` | `varchar(255)` | |
| `product_id` | `bigint unsigned` | FK → products(id) CASCADE |
| `user_id` | `bigint unsigned` | FK → users(id) CASCADE |
| `merchant_id` | `bigint unsigned` | FK → users(id) CASCADE |
| `bid_amount` | `double(20,2)` | |
| `created_at` / `updated_at` | `timestamp` | |
| `deleted_at` | `timestamp` | nullable — soft deletes |

### `groups`

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint unsigned AI` | PK |
| `store_id` | `bigint unsigned` | nullable, FK → stores(id) SET NULL |
| `name_en` | `varchar(255)` | |
| `name_om` | `varchar(255)` | nullable — Arabic |
| `start_date` / `end_date` | `datetime` | nullable |
| `inspection_start_date` / `inspection_end_date` | `datetime` | nullable |
| `min_deposit` | `decimal(10,2)` | default 0 |
| `status` | `int` | **1=Active, 2=Inactive** |
| `image` | `varchar(255)` | nullable |
| `created_at` / `updated_at` | `timestamp` | |

### `stores`

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint unsigned AI` | PK |
| `name` | `varchar(255)` | unique |
| `name_en` / `name_om` | `varchar(255)` | nullable — bilingual |
| `slug` | `mediumText` | |
| `author_id` | `bigint unsigned` | FK → users(id) CASCADE |
| `email` / `phone` / `address` | `varchar(255)` | nullable |
| `logo` / `cover_img` | `varchar(255)` | nullable |
| `facebook` / `twitter` / `linkedin` / `instagram` / `pinterest` / `youtube` | `varchar(255)` | individual social columns |
| `created_at` / `updated_at` | `timestamp` | |

### `locations` (unified countries/states/cities)

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint unsigned AI` | PK |
| `name` | `varchar(255)` | |
| `state_id` | `int` | nullable — self-ref parent |
| `country_id` | `int` | nullable — self-ref parent |
| `country_code` | `varchar(255)` | nullable |
| `created_at` / `updated_at` | `timestamp` | |

### Other Legacy Tables

| Table | Purpose |
|---|---|
| `product_translations` | i18n for products (name, short_desc, long_desc, lang) |
| `product_galleries` | Product images (image, product_id) |
| `product_specifications` | Product specs (label, value, product_id) |
| `category_translations` | i18n for categories (name, lang) |
| `support_tickets` | Help desk (subject, description, type, priority, status) |
| `product_reviews` | User reviews (rate, comments, status) |
| `deleted_bid_log` | Mirrors orders schema for deleted bids |
| `bank_transfers` | Order payment proofs (order_id, proof_of_payment) |
| `merchant_payment_infos` | Merchant bank details for payouts |
| `customer_payment_infos` | Customer bank details for withdrawals |

---

## V2 Table Schemas

All v2 tables use `UUID` via `gen_random_uuid()` as primary keys.

### `profiles` (linked to `auth.users`)

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` | PK — matches `auth.users.id` |
| `customId` | `string` | unique, format `C0001` |
| `role` | `UserRole` enum | customer, merchant, admin, super_admin |
| `status` | `UserStatus` enum | active, inactive, suspended, pending_verification |
| `registerAs` | `RegisterType` | individual, company |
| `firstName` / `lastName` | `string` | |
| `firstNameAr` / `lastNameAr` | `string` | nullable — Arabic |
| `email` | `string` | unique |
| `phone` | `string` | nullable |
| `image` | `string` | nullable |
| `individualId` / `companyName` / `companyId` | `string` | nullable |
| `countryId` / `stateId` / `cityId` | `UUID` | FK to location tables |
| `address` / `zipCode` | `string` | nullable |
| `isVip` | `bool` | |
| `emailVerified` | `bool` | |
| `walletBalance` | `Decimal(12,3)` | OMR 3 decimal places |
| `walletBalanceEncrypted` | `Bytes` | pgcrypto encrypted |
| `deletedAt` | `timestamp` | nullable — soft delete |

### `wallet_transactions`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` | PK |
| `referenceNumber` | `string` | unique, format `WTX-YYYY-NNNNNN` |
| `userId` | `UUID` | FK → profiles |
| `orderId` | `UUID` | nullable, FK → orders |
| `productId` | `UUID` | nullable, FK → products |
| `type` | `WalletTxType` enum | deposit, bid, purchase, withdraw, return, refund, bid_final_payment, admin_adjustment, commission, hold, release, fee |
| `status` | `WalletTxStatus` enum | pending, completed, rejected, on_hold, cancelled |
| `amount` | `Decimal(12,3)` | |
| `adminCommission` / `merchantAmount` / `taxAmount` / `totalAmount` | `Decimal(12,3)` | nullable |
| `paymentMethod` | `string` | nullable |
| `transactionId` | `string` | nullable — gateway/legacy reference |
| `gatewayAmount` | `Decimal(12,3)` | nullable |
| `currency` | `string` | nullable |
| `proofDocument` | `string` | nullable |
| `description` | `string` | nullable |
| `amountEncrypted` | `Bytes` | pgcrypto encrypted |

### `bank_deposits`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` | PK |
| `userId` | `UUID` | FK → profiles |
| `walletTxId` | `UUID` | FK → wallet_transactions |
| `amount` | `Decimal(12,3)` | |
| `amountEncrypted` | `Bytes` | pgcrypto encrypted |
| `proofDocument` | `string` | nullable |
| `bankName` | `string` | nullable |
| `referenceNumber` | `string` | nullable |
| `status` | `WalletTxStatus` | pending, completed, rejected |
| `adminNotes` | `string` | nullable |
| `reviewedBy` | `UUID` | nullable, FK → profiles |
| `reviewedAt` | `timestamp` | nullable |

### `withdrawals`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` | PK |
| `userId` | `UUID` | FK → profiles |
| `amount` | `Decimal(12,3)` | |
| `bankName` / `accountNumber` / `accountHolder` / `iban` | `string` | |
| `status` | `WithdrawalStatus` | pending, approved, rejected, processing, completed |
| `adminNotes` | `string` | nullable |
| `reviewedBy` / `reviewedAt` | UUID / timestamp | nullable |

### Other V2 Tables

| Table | PK | Key Differences from Legacy |
|---|---|---|
| `stores` | UUID | `name` is JsonB bilingual; social links in single JsonB column |
| `categories` | UUID | Hierarchical with `parentId`; `name`/`description` are JsonB |
| `groups` | UUID | Has `merchantId`; `name`/`description` are JsonB; `GroupStatus` enum |
| `products` | UUID | `name`/`description` are JsonB; has bid increment tiers, snipe extension, reserve price |
| `orders` | UUID | `orderNumber` format `MZD-YYYY-NNNN`; has `groupId`, commission amounts |
| `bid_history` | UUID | Has `isWinning` bool, FK to orders |
| `countries` / `states` / `cities` | UUID | Normalized from single `locations` table; bilingual JsonB names |

---

## Status Value Mapping

### Users: `role` (int → enum)

| Legacy | Meaning | V2 `UserRole` |
|---|---|---|
| 1 | Customer | `customer` |
| 2 | Author/Merchant | `merchant` |
| 3 | Admin | `admin` |
| 4 | SuperAdmin | `super_admin` |

### Users: `status` (int → enum)

| Legacy | Meaning | V2 `UserStatus` |
|---|---|---|
| 1 | Active | `active` |
| 2 | Inactive | `inactive` |
| — | — | `suspended` (new) |
| — | — | `pending_verification` (new) |

### Products: `status` (int → enum)

| Legacy | Meaning | V2 `ProductStatus` |
|---|---|---|
| 1 | Published | `published` |
| 2 | Draft | `draft` |
| 3 | Pending | `pending` |
| 4 | Inactive | `inactive` |
| — | — | `closed` (new) |

### Products: other enums

| Field | Legacy | V2 |
|---|---|---|
| `sale_type` | 1=Auction, 2=Direct | `ProductSaleType`: `auction`, `direct` |
| `schedule_type` | 1=Yes, 2=No | `ProductScheduleType`: `scheduled`, `default` |
| `min_deposit_type` | 1=Percent, 2=Fixed | `DepositType`: `percentage`, `fixed` |

### Orders: `status` (int → enum)

| Legacy | Meaning | V2 `OrderStatus` |
|---|---|---|
| 1 | Processing | `processing` |
| 2 | Win | `win` |
| 3 | Reject | `rejected` |
| 4 | Completed | `completed` |
| 5 | On Hold | `on_hold` |
| 6 | Delivered | `delivered` |
| 7 | Refunded | `refunded` |
| 8 | Shipped | `shipped` |

### Orders: `payment_status` (int → enum)

| Legacy | Meaning | V2 `PaymentStatus` |
|---|---|---|
| 1 | Partials | `partial` |
| 2 | Unpaid | `unpaid` |
| 3 | Paid | `paid` |

### Orders: `type` (int → enum)

| Legacy | Meaning | V2 `OrderType` |
|---|---|---|
| 2 | Bid | `bid` |
| 3 | Purchase | `purchase` |

### Wallet Transactions: `type` (int → enum)

| Legacy | Meaning | V2 `WalletTxType` |
|---|---|---|
| 1 | Deposit | `deposit` |
| 2 | Bid | `bid` |
| 3 | Purchase | `purchase` |
| 4 | Withdraw | `withdraw` |
| 5 | Return | `return` |
| 6 | Refund | `refund` |
| 7 | Bid Final Payment | `bid_final_payment` |
| — | — | `admin_adjustment` (new) |
| — | — | `commission` (new) |
| — | — | `hold` (new) |
| — | — | `release` (new) |
| — | — | `fee` (new) |

### Wallet Transactions: `status` (int → enum)

| Legacy | Meaning | V2 `WalletTxStatus` |
|---|---|---|
| 1 | Processing | `pending` |
| 2 | Completed | `completed` |
| 3 | Cancel | `cancelled` |
| — | — | `rejected` (new) |
| — | — | `on_hold` (new) |

### Bank Deposits: `status`

Legacy uses integer (default 0) with no documented enum values in migrations. Map to V2 `WalletTxStatus`: `pending`, `completed`, `rejected`.

### Categories / Groups

| Legacy | Meaning | V2 |
|---|---|---|
| 1 | Active | `ContentStatus.active` / `GroupStatus.active` |
| 2 | Inactive | `ContentStatus.inactive` |
| — | — | `GroupStatus.upcoming`, `closed`, `cancelled` (new) |

### Support Tickets

| Field | Legacy | V2 |
|---|---|---|
| `status` | 1=Active, 2=Closed | `TicketStatus`: `open`, `in_progress`, `resolved`, `closed` |
| `priority` | 1=High, 2=Medium, 3=Low | `TicketPriority`: `low`, `medium`, `high`, `urgent` |

---

## Key Structural Differences

| Aspect | Legacy (Laravel/MySQL) | V2 (Next.js/Supabase) |
|---|---|---|
| **Primary keys** | `bigint unsigned AUTO_INCREMENT` | `UUID` via `gen_random_uuid()` |
| **Auth** | Laravel built-in (password in users table) | Supabase `auth.users` (profiles link via UUID) |
| **Translations** | Separate `*_translations` tables with `lang` column | JsonB columns: `{"en": "...", "ar": "..."}` |
| **Locations** | Single `locations` table (flat, self-referencing) | Normalized: `countries` → `states` → `cities` |
| **Wallets** | Single `wallets` table for all transactions | Split: `wallet_transactions` + `bank_deposits` + `withdrawals` |
| **Bank deposits** | `bank_deposites` (typos: `ammount`, `transection_id`) | `bank_deposits` (clean column names) |
| **Financial precision** | `double(10,2)` — 2 decimal places | `Decimal(12,3)` — 3 decimal places (OMR baisa) |
| **Financial encryption** | None | `pgcrypto` for wallet balance and transaction amounts |
| **Social links** | Individual columns (facebook, twitter, etc.) | Single `socialLinks` JsonB column |
| **Store/Group names** | `name` + `name_en` + `name_om` columns | Single `name` JsonB: `{"en": "...", "ar": "..."}` |
| **Order numbers** | `strtoupper(Str::random(7))` — random | Structured: `MZD-YYYY-NNNN` with DB sequence |
| **Wallet references** | No reference numbers | `WTX-YYYY-NNNNNN` with DB sequence |
| **Bid history** | No `isWinning` flag, no FK to orders | Has `isWinning` bool, FK to `orders` |
| **Soft deletes** | Some tables (bid_history, bank_deposites) | `deletedAt` on `profiles`, `products` |
| **RLS** | Application-level auth checks | Row Level Security policies on all tables |

---

## Legacy ID Generation Patterns

All generated using Laravel's `Str::random(n)` which produces base62 alphanumeric strings (A-Z, a-z, 0-9) via `random_bytes()` → base64 → strip non-alphanumeric.

| Usage | Length | Format | Code Location |
|---|---|---|---|
| `transaction_id` (wallet) | 20 | `[A-Za-z0-9]{20}` | `PaymentController`, `CustomerController`, `RazorpayController`, `HomeController` |
| `payer_id` (wallet) | 20 | `[A-Za-z0-9]{20}` | Same controllers |
| `transection_id` (bank deposit) | 20 | `[A-Za-z0-9]{20}` | Same controllers |
| `order_number` | 7 | `[A-Z0-9]{7}` (uppercased) | `app/Http/Helpers.php` via `strtoupper(Str::random(7))` |
| `remember_token` | 10 | `[A-Za-z0-9]{10}` | `UserFactory`, `UserSeeder` |
| `verify_token` | 32 | `[A-Za-z0-9]{32}` | `RegisterController`, `VerificationController` |
| Image file names | 10 | `[A-Za-z0-9]{10}` prefix | `PageController` |

**Example legacy IDs**: `PCsowreqMA4R8UiDtsBS`, `f99999a` (order), `xK9mR2pL4nQ7wY3jT8vB`

---

## Migration Script Status

**File**: `scripts/migrate-mysql-to-supabase.ts`

### Implemented (scaffold only)

| Step | Function | Status |
|---|---|---|
| 1 | Languages | TODO |
| 2 | `migrateCategories()` | Scaffold — maps name/slug/status |
| 3 | `migrateProfiles()` | Scaffold — maps user fields, creates auth.users |
| 4 | `migrateStores()` | TODO |
| 5 | `migrateGroups()` | TODO |
| 6 | `migrateProducts()` | Scaffold — maps product fields, handles translations |
| 7 | `migrateBidHistory()` | TODO |
| 8 | `migrateOrders()` | Scaffold — maps order fields, resolves FKs |
| 9 | `migrateWalletTransactions()` | TODO |
| 10 | `migrateBankDeposits()` | TODO |
| 11 | `migrateWithdrawals()` | TODO |
| 12 | Blogs | TODO |
| 13 | `migrateSupportTickets()` | TODO |
| 14 | Watchlists | TODO |
| 15 | Menus | TODO |
| 16 | Settings | TODO |

### Helper Functions Available

- `mapProductStatus(legacyInt)` → V2 ProductStatus enum
- `mapUserStatus(legacyInt)` → V2 UserStatus enum
- `mapOrderStatus(legacyInt)` → V2 OrderStatus enum
- `toBool(value)` → boolean conversion

### Migration Order (dependencies)

```
1. countries/states/cities (locations)
2. categories
3. profiles (users → auth.users + profiles)
4. stores (depends on profiles)
5. groups (depends on stores)
6. products (depends on categories, profiles, stores, groups)
7. orders (depends on products, profiles)
8. bid_history (depends on orders, products, profiles)
9. wallet_transactions (depends on profiles, orders)
10. bank_deposits (depends on profiles, wallet_transactions)
11. withdrawals (depends on profiles)
```

### FK Resolution Strategy

During migration, maintain in-memory lookup maps:

```typescript
const userIdMap = new Map<number, string>();    // legacy int → v2 UUID
const productIdMap = new Map<number, string>(); // legacy int → v2 UUID
const categoryIdMap = new Map<number, string>();
const storeIdMap = new Map<number, string>();
const groupIdMap = new Map<number, string>();
const orderIdMap = new Map<number, string>();
const walletTxIdMap = new Map<number, string>();
```

Each migration step populates its map so subsequent steps can resolve foreign keys.
