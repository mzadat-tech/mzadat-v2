# In-App Notification System — Architecture

## Overview

The notification system delivers real-time and persistent in-app notifications to **customers** and **admins**. Notifications are:

- **Bilingual** (English + Arabic) — stored as JSONB `{ en, ar }`
- **Persistent** — stored in PostgreSQL `notifications` table
- **Real-time** — pushed via WebSocket to `user:{userId}` rooms
- **Filterable** — by type, read/unread status, with pagination
- **Extensible** — adding a new notification type requires only a new factory method + one integration call

---

## Database Schema

```sql
CREATE TABLE notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL,       -- e.g. 'outbid', 'auction_won', 'admin_new_bid'
  title      JSONB       NOT NULL DEFAULT '{}',  -- { "en": "...", "ar": "..." }
  body       JSONB       NOT NULL DEFAULT '{}',  -- { "en": "...", "ar": "..." }
  data       JSONB       DEFAULT '{}',   -- type-specific metadata (productId, amount, etc.)
  is_read    BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX notifications_user_id_idx ON notifications(user_id);
CREATE INDEX notifications_user_id_is_read_idx ON notifications(user_id, is_read);
CREATE INDEX notifications_created_at_idx ON notifications(created_at DESC);
```

**RLS Policies:**
- Users can SELECT/UPDATE their own notifications
- Admins can manage all notifications

---

## Notification Types

### Customer Notifications

| Type | Trigger | Description |
|------|---------|-------------|
| `outbid` | `bid.service → placeBid()` | User has been outbid on an auction |
| `auction_won` | `winner.service → processWinner()` | User won an auction |
| `auction_lost` | `winner.service → processWinner()` | User lost an auction (bid but didn't win) |
| `auction_start` | `auction.service → activateAuction()` | Registered auction/group is now live |
| `auction_end` | `winner.service → processWinner()` | Auction the user bid on has ended |
| `auction_extended` | Available in `notify.auctionExtended()` | Auction was extended due to anti-sniping |
| `inspection_start` | Available in `notify.inspectionStart()` | Group inspection period started |
| `inspection_end` | Available in `notify.inspectionEnd()` | Group inspection period ended |
| `wallet_deposit_approved` | `wallet.service → approveDeposit()` | Bank deposit approved |
| `wallet_deposit_rejected` | `wallet.service → rejectDeposit()` | Bank deposit rejected |
| `wallet_credited` | `wallet.service → adminAdjustment()` | Wallet credited by admin |
| `wallet_debited` | `wallet.service → adminAdjustment()` | Wallet debited by admin |
| `deposit_refund` | `winner.service → refundNonWinnerDeposits()` | Auction deposit refunded |
| `registration_confirmed` | `registration.service → register()` | Group registration confirmed |
| `payment_reminder` | Available in `notify.paymentReminder()` | Reminder to complete payment for won auction |
| `reserve_not_met` | `winner.service → processWinner()` | Reserve price not met, auction closed |

### Admin Notifications

| Type | Trigger | Description |
|------|---------|-------------|
| `admin_wallet_deposit_request` | `wallet.service → deposit()` | New bank deposit pending review |
| `admin_wallet_deposit_reviewed` | Available in `notify` | Deposit reviewed by another admin |
| `admin_new_bid` | `bid.service → placeBid()` | New bid placed on any auction |
| `admin_auction_ended` | `auction.service → closeAuction()` | Auction ended |
| `admin_winner_processed` | `winner.service → processWinner()` | Winner determined for an auction |
| `admin_no_winner` | `winner.service → processWinner()` | Auction closed without winner |
| `admin_new_registration` | `registration.service → register()` | New group registration |
| `admin_new_user` | Available in `notify.adminNewUser()` (not yet wired) | New user registered |
| `admin_wallet_adjustment` | `wallet.service → adminAdjustment()` | Admin adjusted a user's wallet |

---

## API Endpoints

All endpoints require authentication via `authMiddleware`.

### User Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/notifications` | List notifications (paginated, filterable) |
| `GET` | `/api/notifications/unread-count` | Get unread count for badge |
| `PATCH` | `/api/notifications/read-all` | Mark all as read |
| `PATCH` | `/api/notifications/:id/read` | Mark one as read |
| `DELETE` | `/api/notifications/:id` | Delete a notification |

### Admin Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/notifications/admin` | List admin notifications |

### Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| `page` | `number` | Page number (default: 1) |
| `pageSize` | `number` | Items per page (default: 20, max: 100) |
| `isRead` | `'true' \| 'false'` | Filter by read status |
| `type` | `string` | Filter by notification type |

### Response Format

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "outbid",
      "title": { "en": "You have been outbid!", "ar": "تم تجاوز مزايدتك!" },
      "body": { "en": "Someone placed a higher bid...", "ar": "قام شخص ما..." },
      "data": { "productId": "uuid", "currentBid": "150.000" },
      "isRead": false,
      "createdAt": "2026-03-17T10:00:00.000Z"
    }
  ],
  "total": 42,
  "page": 1,
  "pageSize": 20,
  "totalPages": 3
}
```

---

## Real-Time Delivery (WebSocket)

Notifications are pushed in real-time via the existing WebSocket server.

### User Subscription

Clients subscribe to their personal notification channel:

```json
{ "type": "subscribe", "room": "user:<userId>" }
```

### Server Push

When a notification is created, the server pushes to the user's room:

```json
{
  "type": "notification",
  "payload": {
    "id": "uuid",
    "type": "outbid",
    "title": { "en": "...", "ar": "..." },
    "body": { "en": "...", "ar": "..." },
    "data": { "productId": "..." },
    "isRead": false,
    "createdAt": "2026-03-17T10:00:00Z"
  }
}
```

---

## Architecture Diagram

```
┌──────────────┐     ┌───────────────────┐     ┌──────────────────┐
│  Services    │────▶│  notify.*()       │────▶│  notifications   │
│  (bid, wallet│     │  Factory helpers   │     │  table (PG)      │
│   winner,    │     └───────┬───────────┘     └──────────────────┘
│   auction,   │             │
│   reg)       │             ▼
└──────────────┘     ┌───────────────────┐     ┌──────────────────┐
                     │  broadcastNotif   │────▶│  WebSocket       │
                     │  Event()          │     │  user:{userId}   │
                     └───────────────────┘     │  room            │
                                               └────────┬─────────┘
                                                        │
                                                        ▼
                                               ┌──────────────────┐
                                               │  Frontend Client │
                                               │  (notification   │
                                               │   bell / toast)  │
                                               └──────────────────┘
```

---

## Code Structure

```
apps/api/src/
├── services/
│   └── notification.service.ts    # Core service + factory helpers
├── routes/
│   └── notifications.ts           # REST API endpoints
├── websocket/
│   ├── broadcaster.ts             # broadcastNotificationEvent()
│   └── server.ts                  # user:{userId} room support
```

---

## How to Add a New Notification

### Step 1: Define the Type

Add the new type to the appropriate union in `notification.service.ts`:

```typescript
// For customer notifications:
export type CustomerNotificationType =
  | 'outbid'
  | 'your_new_type'  // ← Add here
  | ...

// For admin notifications:
export type AdminNotificationType =
  | 'admin_new_bid'
  | 'admin_your_new_type'  // ← Add here
  | ...
```

### Step 2: Create a Factory Helper

Add a helper method to the `notify` object:

```typescript
export const notify = {
  // ...existing helpers...

  async yourNewNotification(userId: string, someParam: string) {
    return notificationService.create({
      userId,
      type: 'your_new_type',
      title: { en: 'English title', ar: 'Arabic title' },
      body: {
        en: `English body with ${someParam}`,
        ar: `Arabic body with ${someParam}`,
      },
      data: { someParam },
    })
  },
}
```

### Step 3: Call It from the Relevant Service

In the service where the event occurs, import and call the factory:

```typescript
import { notify } from './notification.service.js'

// Inside some method, after the action succeeds:
notify.yourNewNotification(userId, 'value').catch((e) =>
  console.error('Notification error:', e),
)
```

> **Important:** Always use `.catch()` to prevent notification failures from breaking
> the main business logic. Notifications are fire-and-forget side effects.

---

## Suggested Future Notifications

These notification types have factory helpers ready but are **not yet wired** to any trigger. They can be activated by adding a single `notify.*()` call in the appropriate service.

| Type | Factory Method | Suggested Trigger |
|------|---------------|-------------------|
| `auction_extended` | `notify.auctionExtended()` | After anti-sniping extension in `bid.service` |
| `inspection_start` | `notify.inspectionStart()` | Inspection lifecycle worker/cron |
| `inspection_end` | `notify.inspectionEnd()` | Inspection lifecycle worker/cron |
| `payment_reminder` | `notify.paymentReminder()` | Cron job checking unpaid winning orders |
| `admin_new_user` | Not yet implemented | After user registration in `auth.service` |
| `admin_wallet_deposit_reviewed` | Not yet implemented | After admin reviews a deposit (audit trail for other admins) |

### Additional Notification Ideas

| Category | Type | Description |
|----------|------|-------------|
| **Customer** | `watchlist_auction_start` | Auction on user's watchlist is starting |
| **Customer** | `watchlist_price_drop` | Direct sale item on watchlist has price drop |
| **Customer** | `order_status_update` | Order status changed (shipped, delivered, etc.) |
| **Customer** | `withdrawal_approved` | Withdrawal request approved |
| **Customer** | `withdrawal_rejected` | Withdrawal request rejected |
| **Customer** | `account_verified` | Account verification completed |
| **Customer** | `support_ticket_reply` | Support team replied to a ticket |
| **Customer** | `new_lots_in_group` | New lots added to a group the user is registered for |
| **Admin** | `admin_new_withdrawal` | New withdrawal request pending review |
| **Admin** | `admin_new_support_ticket` | New support ticket opened |
| **Admin** | `admin_suspicious_activity` | Suspicious bidding or wallet activity detected |
| **Admin** | `admin_system_alert` | System health alerts (queue failures, etc.) |
| **Merchant** | `merchant_lot_approved` | Merchant's lot was approved by admin |
| **Merchant** | `merchant_lot_sold` | Merchant's lot was sold at auction |
| **Merchant** | `merchant_payment_received` | Commission settled, payment available |

---

## Frontend Integration Guide

### Fetching Notifications

```typescript
// GET /api/notifications?page=1&pageSize=20
const response = await fetch('/api/notifications', {
  headers: { Authorization: `Bearer ${token}` },
})
const { data, total, totalPages } = await response.json()
```

### Unread Count (for badge)

```typescript
// GET /api/notifications/unread-count
const { data: { count } } = await fetch('/api/notifications/unread-count', {
  headers: { Authorization: `Bearer ${token}` },
}).then(r => r.json())
```

### WebSocket Subscription

```typescript
const ws = new WebSocket('wss://api.mzadat.com/ws')

ws.onopen = () => {
  // Subscribe to personal notifications
  ws.send(JSON.stringify({ type: 'subscribe', room: `user:${userId}` }))
}

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data)
  if (msg.type === 'notification') {
    // Show toast / update badge
    showToast(msg.payload.title[locale], msg.payload.body[locale])
    incrementUnreadCount()
  }
}
```

### Mark as Read

```typescript
// Single
await fetch(`/api/notifications/${id}/read`, { method: 'PATCH', ... })

// All
await fetch('/api/notifications/read-all', { method: 'PATCH', ... })
```

---

## Design Decisions

1. **Fire-and-forget pattern** — Notification creation never blocks or rolls back the main business transaction. All notification calls use `.catch()` to swallow errors.

2. **No separate notification queue** — For the current scale, notifications are created synchronously inside services after the DB commit. If notification volume grows significantly, a dedicated BullMQ queue can be added without changing the `notify.*()` API.

3. **Single table, string type** — Instead of a typed enum in the DB, notification types are plain strings. This avoids DB migrations when adding new types. The TypeScript union provides compile-time safety.

4. **Admin notifications via `notifyAdmins()`** — Queries all active admin/super_admin profiles and creates one notification per admin. For very large admin teams, this could be optimized with a dedicated admin notification table.

5. **JSONB for bilingual content** — Avoids separate columns per language and supports adding new languages without schema changes.

6. **Cleanup strategy** — `notificationService.cleanup(daysOld)` deletes read notifications older than N days. Should be wired to a cron job (e.g., weekly with `daysOld = 90`).
