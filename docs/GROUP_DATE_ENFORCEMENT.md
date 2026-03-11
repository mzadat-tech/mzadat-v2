# Group Date Enforcement — Architecture & Implementation

> **Rule**: Group dates are the absolute source of truth for grouped auction lots.
> Standalone lots (no group) use their own product-level dates.
> **All dates are displayed and stored in Asia/Muscat (UTC+4) timezone.**

## Overview

When a product (lot) belongs to a group, its `startDate` and `endDate` are **seeded from the group** at assignment time and kept in sync when the group's dates change. The lot's dates are then used by all auction lifecycle logic (countdown timers, live/upcoming classification, winner processing, anti-sniping).

This is a **copy-on-assign + propagate-on-change** pattern, NOT a runtime computed field. The product's persisted `startDate`/`endDate` remain the operational fields — they're just always kept in lockstep with the group.

---

## Data Flow

```
┌──────────────┐      assign lot to group       ┌──────────────┐
│    GROUP     │ ──── copies dates to ──────────▶│   PRODUCT    │
│  startDate   │                                 │  startDate   │  ◀── used by timers,
│  endDate     │      update group dates         │  endDate     │      filters, winner
│              │ ──── propagates to all lots ──▶ │  originalEnd │      processing, etc.
└──────────────┘                                 └──────────────┘
                                                       │
                                                 anti-sniping can
                                                 extend endDate past
                                                 group.endDate ✓
```

### Key Invariants

1. **Grouped lots**: `product.startDate == group.startDate` and `product.endDate == group.endDate` (unless anti-sniping has extended `endDate`)
2. **Standalone lots**: `product.startDate` and `product.endDate` are set directly by the admin
3. **Anti-sniping**: Can extend an individual lot's `endDate` past its group's `endDate`. Once extended, group date updates will NOT roll it back
4. **`originalEndDate`**: Set to `group.endDate` for grouped lots (or the admin-set `endDate` for standalone). Anti-sniping uses this as the baseline to calculate extension windows

---

## Admin Panel Implementation (apps/admin)

### 1. Group Option Data (`lots.ts → GroupOption`)

```typescript
export interface GroupOption {
  id: string
  nameEn: string
  minDeposit: number
  startDate: string   // ISO datetime string (YYYY-MM-DDTHH:mm)
  endDate: string     // ISO datetime string (YYYY-MM-DDTHH:mm)
}
```

The dropdown query fetches `start_date, end_date` from the `groups` table alongside `name` and `min_deposit`.

### 2. Lot Form UI (`lot-form.tsx`)

When a group is selected:
- `startDate`, `endDate` are auto-filled from the group
- `scheduleType` is forced to `'scheduled'`
- Date pickers + schedule toggle are rendered **disabled/readonly**
- A banner shows: _"Dates inherited from group X — edit the group to change schedule"_

When group is cleared (set to "None"):
- Dates remain as-is (not wiped) — admin can re-enter manually
- Date pickers become editable again

### 3. Server-Side Enforcement (`lots.ts → createLot / updateLot`)

Defense-in-depth: even if the UI is bypassed, the server always enforces:

```typescript
if (data.groupId) {
  const group = await prisma.group.findUnique({
    where: { id: data.groupId },
    select: { startDate: true, endDate: true },
  })
  effectiveStartDate = group.startDate    // overrides form data
  effectiveEndDate = group.endDate        // overrides form data
  effectiveScheduleType = 'scheduled'     // forced
}
```

For standalone lots with `scheduleType === 'scheduled'`:
- Both `startDate` and `endDate` are required
- `endDate` must be after `startDate`

### 4. Group Date Propagation (`groups.ts → updateGroup`)

When a group's dates are updated:

```typescript
// 1. Detect if dates actually changed
const datesChanged = oldGroup.startDate !== newStartDate || oldGroup.endDate !== newEndDate

// 2. Update child lots (with anti-snipe guard)
if (datesChanged) {
  await prisma.product.updateMany({
    where: {
      groupId: id,
      deletedAt: null,
      endDate: { lte: oldGroup.endDate },  // don't roll back anti-snipe extensions
    },
    data: {
      startDate: newStartDate,
      endDate: newEndDate,
      originalEndDate: newEndDate,
    },
  })
}
```

The `endDate: { lte: oldGroup.endDate }` guard ensures lots whose `endDate` was already extended by anti-sniping are NOT rolled back.

---

## Express/API Implementation Guide

When building the bidding and auction engine in `apps/api` (Express), follow these rules:

### Querying Active/Live Auctions

Always query using **product-level dates** (they're already synced from the group):

```typescript
// Live auctions (currently active)
const liveAuctions = await prisma.product.findMany({
  where: {
    saleType: 'auction',
    status: 'published',
    startDate: { lte: now },
    endDate: { gte: now },
    deletedAt: null,
  },
})

// Upcoming auctions
const upcomingAuctions = await prisma.product.findMany({
  where: {
    saleType: 'auction',
    status: 'published',
    startDate: { gt: now },
    deletedAt: null,
  },
})
```

**DO NOT** query `group.startDate`/`group.endDate` for auction lifecycle decisions. Product dates are the operational truth.

### Anti-Sniping Logic

```typescript
// When a bid arrives in the last N minutes before endDate:
const ANTI_SNIPE_WINDOW_MS = 5 * 60 * 1000  // 5 minutes
const ANTI_SNIPE_EXTENSION_MS = 5 * 60 * 1000

async function handleBid(productId: string, bid: Bid) {
  const product = await prisma.product.findUnique({ where: { id: productId } })
  const now = new Date()
  const timeToEnd = product.endDate.getTime() - now.getTime()

  if (timeToEnd > 0 && timeToEnd <= ANTI_SNIPE_WINDOW_MS) {
    // Extend the end date — this may push past the group's endDate, which is OK
    const newEndDate = new Date(product.endDate.getTime() + ANTI_SNIPE_EXTENSION_MS)
    await prisma.product.update({
      where: { id: productId },
      data: { endDate: newEndDate },
      // NOTE: do NOT update originalEndDate — it stays as the group's original endDate
    })
  }
}
```

Key points:
- `originalEndDate` is the baseline (group's `endDate` for grouped lots)
- `endDate` is the current effective end time (may be extended)
- Only update `endDate`, never `originalEndDate`, during anti-sniping
- Extensions are per-lot, not per-group — other lots in the same group are unaffected

### Winner Processing (Cron)

```typescript
// Find expired auctions to process winners
const expiredAuctions = await prisma.product.findMany({
  where: {
    saleType: 'auction',
    status: 'published',     // still active
    endDate: { lt: now },    // auction has ended (including any anti-snipe extension)
    deletedAt: null,
  },
})

for (const product of expiredAuctions) {
  // Process winner...
  // The product.endDate already accounts for any anti-sniping extensions
}
```

### Creating Lots via API

If the API will also support creating/assigning lots to groups:

```typescript
async function createLotViaAPI(data: CreateLotInput) {
  let startDate = data.startDate
  let endDate = data.endDate

  if (data.groupId) {
    // ALWAYS override with group dates
    const group = await prisma.group.findUnique({ where: { id: data.groupId } })
    if (!group) throw new Error('Group not found')
    startDate = group.startDate
    endDate = group.endDate
  }

  return prisma.product.create({
    data: {
      ...otherFields,
      startDate,
      endDate,
      originalEndDate: endDate,
    },
  })
}
```

### Real-time Countdown & Status

For WebSocket/SSE countdown timers:

```typescript
function getAuctionStatus(product: Product): 'upcoming' | 'live' | 'ended' {
  const now = new Date()
  if (product.startDate && now < product.startDate) return 'upcoming'
  if (product.endDate && now > product.endDate) return 'ended'
  return 'live'
}

// Countdown target = product.endDate (already includes anti-snipe extensions)
// DO NOT use group.endDate for countdown
```

### Group Status Derivation

If you need to show group-level status on the frontend:

```typescript
async function getGroupStatus(groupId: string): Promise<'upcoming' | 'active' | 'closed'> {
  const now = new Date()
  const group = await prisma.group.findUnique({ where: { id: groupId } })

  // Check if ANY lot in the group is still active (handles anti-snipe extensions)
  const activeLotCount = await prisma.product.count({
    where: {
      groupId,
      endDate: { gte: now },
      status: 'published',
      deletedAt: null,
    },
  })

  if (activeLotCount > 0) return 'active'
  if (now < group.startDate) return 'upcoming'
  return 'closed'
}
```

---

## Database Schema Reference

### Groups Table
| Field | Type | Required | Notes |
|---|---|---|---|
| `startDate` | `DateTime` (timestamptz) | YES | Source of truth for grouped lot dates |
| `endDate` | `DateTime` (timestamptz) | YES | Source of truth for grouped lot dates |
| `inspectionStartDate` | `DateTime?` | NO | Display only |
| `inspectionEndDate` | `DateTime?` | NO | Display only |
| `status` | Enum | YES | `upcoming \| active \| closed \| cancelled` |

### Products Table
| Field | Type | Required | Notes |
|---|---|---|---|
| `startDate` | `DateTime?` (timestamptz) | NO | Operational field — drives all auction logic |
| `endDate` | `DateTime?` (timestamptz) | NO | Operational field — may be extended by anti-sniping |
| `originalEndDate` | `DateTime?` | NO | Anti-snipe baseline — NOT extended during sniping |
| `groupId` | `String?` | NO | FK to Group — null = standalone lot |
| `scheduleType` | String | YES | `default \| scheduled` — forced to `scheduled` when grouped |

---

## Timezone Handling (Asia/Muscat)

The platform operates in **Asia/Muscat (UTC+4, no DST)**. All dates are `timestamptz` in the DB (absolute instants), but must be displayed/edited in Muscat wall-clock time.

### The Display Problem
`new Date().toISOString().slice(0, 16)` converts to **UTC**, so `06:20 +04:00` becomes `02:20Z` — a 4-hour shift when displayed in forms.

### The Storage Problem
`new Date("2026-03-05T06:20")` (no offset) uses the **server's local timezone** — NOT Muscat. If the server runs in IST (+5:30), that 06:20 is parsed as IST → stored as `00:50Z` instead of the correct `02:20Z` (a 1.5-hour error). Setting `TZ=Asia/Muscat` in `.env` does NOT help because dotenv loads after the Node.js process starts.

### The Solution
A shared helper (`apps/admin/src/lib/timezone.ts`) provides:

```typescript
// ── DISPLAY (server/client) ─────────────────────────────────
toMuscatDateTimeLocal(date)  // → "2026-03-05T06:20" (Muscat time)
toMuscatDate(date)           // → "2026-03-05"
toMuscatTime(date)           // → "06:20"

// ── PARSING (server-side, for storing form input) ───────────
parseMuscatDateTime(str)     // "2026-03-05T06:20" → Date(02:20Z)
parseMuscatDateTimeOrNull(str) // same but returns null for empty
```

Uses `Intl.DateTimeFormat` with `timeZone: 'Asia/Muscat'` for display, and explicit `+04:00` offset appending for parsing — works regardless of the server's local timezone.

### Rules for Express/API
- **Display**: Always format with `timeZone: 'Asia/Muscat'` when sending human-readable times
- **Storage**: Use `timestamptz` (Postgres stores the absolute instant, timezone is for display)
- **Parsing form input**: Form strings like `"2026-03-05T06:20"` represent Muscat time. **Never use `new Date(formString)` directly** — it uses the server's local TZ. Instead:
  ```typescript
  // CORRECT — explicitly append Muscat offset
  import { parseMuscatDateTime } from '@/lib/timezone'
  const utcDate = parseMuscatDateTime(formValue)  // appends +04:00

  // Or manually:
  const utcDate = new Date(`${formValue}:00+04:00`)
  ```
- **Never use `.toISOString().slice(0, 16)`** for display — it loses the timezone
- **Never use `new Date(formString)` without an offset** — it uses the wrong timezone

---

## Files Changed

| File | What Changed |
|---|---|
| `apps/admin/src/lib/timezone.ts` | New — `toMuscatDateTimeLocal`, `toMuscatDate`, `toMuscatTime` (display); `parseMuscatDateTime`, `parseMuscatDateTimeOrNull` (parsing with explicit +04:00 offset) |
| `apps/admin/src/lib/actions/lots.ts` | `GroupOption` extended with dates; `createLot`/`updateLot` enforce group dates server-side; standalone date validation; uses `parseMuscatDateTime` for server-TZ-safe date parsing |
| `apps/admin/src/lib/actions/groups.ts` | `createGroup`/`updateGroup` use `parseMuscatDateTime` for all date parsing; `updateGroup` propagates date changes to child lots (with anti-snipe guard) |
| `apps/admin/src/app/(dashboard)/products/lot-form.tsx` | `handleGroupChange` auto-fills dates; schedule section disabled when grouped; timezone-safe DatePicker handlers |
| `apps/admin/src/app/(dashboard)/groups/groups-client.tsx` | `formatDateTime` uses explicit `Asia/Muscat` timezone; `setTimePart` uses Muscat date for "today" fallback |

---

## Legacy Codebase Notes

The legacy PHP codebase (`mzadat-legacy/`) does NOT implement these rules yet. Key differences:

- `ProductController.php`: Sets dates independently from form — no group-date override
- `GroupController.php`: No propagation to child products on date change
- `ProcessAuctionWinnerSchedules.php`: Uses `product.end_date` — will work correctly once dates are synced
- Blade templates: Date pickers are always editable regardless of group

When migrating, apply the same pattern:
1. In `ProductController@store` / `@update`: if `group_id` is set, fetch group and override `start_date`/`end_date`
2. In `GroupController@update`: after updating group, bulk-update child products' dates
3. In product create/edit blade: disable date inputs via JS when group is selected
