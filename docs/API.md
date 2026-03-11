# Mzadat v2 — API Reference

## Base URL

```
Development: http://localhost:8080/api/v1
Staging:     https://api-staging.mzadat.om/api/v1
Production:  https://api.mzadat.om/api/v1
```

## Authentication

All protected endpoints require a Bearer token from Supabase Auth:

```
Authorization: Bearer <supabase_access_token>
```

## Response Format

All responses follow this structure:

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message",
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error message",
  "code": "VALIDATION_ERROR",
  "details": { ... }
}
```

## Endpoints

### Health Check

| Method | Path            | Auth | Description          |
|--------|-----------------|------|----------------------|
| GET    | `/health`       | No   | API health status    |

---

### Auth

| Method | Path                      | Auth | Description              |
|--------|---------------------------|------|--------------------------|
| POST   | `/auth/register`          | No   | Register new user        |
| POST   | `/auth/login`             | No   | Login (returns tokens)   |
| POST   | `/auth/forgot-password`   | No   | Send password reset      |
| POST   | `/auth/reset-password`    | No   | Reset password           |
| POST   | `/auth/refresh`           | No   | Refresh access token     |
| POST   | `/auth/logout`            | Yes  | Logout (revoke token)    |
| GET    | `/auth/me`                | Yes  | Get current user profile |

---

### Users / Profiles

| Method | Path                      | Auth   | Description              |
|--------|---------------------------|--------|--------------------------|
| GET    | `/users`                  | Admin  | List users (paginated)   |
| GET    | `/users/:id`              | Admin  | Get user details         |
| PATCH  | `/users/:id`              | Admin  | Update user              |
| PATCH  | `/users/:id/status`       | Admin  | Change user status       |
| PATCH  | `/users/:id/role`         | Admin  | Change user role         |
| GET    | `/profile`                | Yes    | Get own profile          |
| PATCH  | `/profile`                | Yes    | Update own profile       |
| PATCH  | `/profile/avatar`         | Yes    | Upload avatar            |

---

### Categories

| Method | Path                      | Auth   | Description              |
|--------|---------------------------|--------|--------------------------|
| GET    | `/categories`             | No     | List categories          |
| GET    | `/categories/:id`         | No     | Get category details     |
| POST   | `/categories`             | Admin  | Create category          |
| PATCH  | `/categories/:id`         | Admin  | Update category          |
| DELETE | `/categories/:id`         | Admin  | Delete category          |

---

### Products (Auctions)

| Method | Path                        | Auth       | Description              |
|--------|-----------------------------|------------|--------------------------|
| GET    | `/products`                 | No         | List products (filtered) |
| GET    | `/products/:id`             | No         | Get product details      |
| POST   | `/products`                 | Merchant+  | Create product           |
| PATCH  | `/products/:id`             | Owner      | Update product           |
| DELETE | `/products/:id`             | Owner      | Delete product           |
| PATCH  | `/products/:id/status`      | Admin      | Change product status    |
| GET    | `/products/:id/bids`        | No         | Get bid history          |

**Query params for listing:**
- `page`, `limit` — Pagination
- `category` — Filter by category slug
- `status` — Filter by status
- `type` — AUCTION | BUY_NOW | BOTH
- `sort` — ending_soon | newest | price_asc | price_desc | most_bids
- `search` — Full-text search
- `minPrice`, `maxPrice` — Price range
- `group` — Filter by group slug

---

### Bids

| Method | Path                      | Auth | Description              |
|--------|---------------------------|------|--------------------------|
| POST   | `/bids`                   | Yes  | Place a bid              |
| GET    | `/bids/my`                | Yes  | My bid history           |
| DELETE | `/bids/:id`               | Yes  | Cancel bid (if allowed)  |

---

### Orders

| Method | Path                      | Auth       | Description              |
|--------|---------------------------|------------|--------------------------|
| GET    | `/orders`                 | Yes        | List my orders           |
| GET    | `/orders/:id`             | Yes        | Get order details        |
| POST   | `/orders/:id/pay`         | Buyer      | Pay for order            |
| PATCH  | `/orders/:id/status`      | Admin      | Update order status      |
| GET    | `/admin/orders`           | Admin      | List all orders          |

---

### Wallet

| Method | Path                        | Auth | Description              |
|--------|-----------------------------|------|--------------------------|
| GET    | `/wallet/balance`           | Yes  | Get wallet balance       |
| GET    | `/wallet/transactions`      | Yes  | Transaction history      |
| POST   | `/wallet/deposit`           | Yes  | Create deposit           |
| POST   | `/wallet/bank-deposit`      | Yes  | Upload bank deposit      |
| POST   | `/wallet/withdraw`          | Yes  | Request withdrawal       |
| GET    | `/admin/deposits`           | Admin| List bank deposits       |
| PATCH  | `/admin/deposits/:id`       | Admin| Approve/reject deposit   |
| GET    | `/admin/withdrawals`        | Admin| List withdrawals         |
| PATCH  | `/admin/withdrawals/:id`    | Admin| Process withdrawal       |

---

### Groups

| Method | Path                      | Auth   | Description              |
|--------|---------------------------|--------|--------------------------|
| GET    | `/groups`                 | No     | List groups              |
| GET    | `/groups/:id`             | No     | Get group details        |
| POST   | `/groups`                 | Admin  | Create group             |
| PATCH  | `/groups/:id`             | Admin  | Update group             |
| DELETE | `/groups/:id`             | Admin  | Delete group             |

---

### Stores

| Method | Path                      | Auth       | Description              |
|--------|---------------------------|------------|--------------------------|
| GET    | `/stores`                 | No         | List stores              |
| GET    | `/stores/:slug`           | No         | Get store details        |
| POST   | `/stores`                 | Merchant+  | Create store             |
| PATCH  | `/stores/:id`             | Owner      | Update store             |
| GET    | `/stores/:id/products`    | No         | Store products           |

---

### Watchlist

| Method | Path                      | Auth | Description              |
|--------|---------------------------|------|--------------------------|
| GET    | `/watchlist`              | Yes  | My watchlist             |
| POST   | `/watchlist/:productId`   | Yes  | Add to watchlist         |
| DELETE | `/watchlist/:productId`   | Yes  | Remove from watchlist    |

---

### Support Tickets

| Method | Path                        | Auth   | Description              |
|--------|-----------------------------|--------|--------------------------|
| GET    | `/tickets`                  | Yes    | My tickets               |
| POST   | `/tickets`                  | Yes    | Create ticket            |
| GET    | `/tickets/:id`              | Yes    | Get ticket details       |
| POST   | `/tickets/:id/reply`        | Yes    | Reply to ticket          |
| PATCH  | `/tickets/:id/close`        | Yes    | Close ticket             |
| GET    | `/admin/tickets`            | Admin  | All tickets              |
| PATCH  | `/admin/tickets/:id/assign` | Admin  | Assign ticket            |

---

### Blog

| Method | Path                      | Auth   | Description              |
|--------|---------------------------|--------|--------------------------|
| GET    | `/blog`                   | No     | List blog posts          |
| GET    | `/blog/:slug`             | No     | Get blog post            |
| POST   | `/blog`                   | Admin  | Create blog post         |
| PATCH  | `/blog/:id`               | Admin  | Update blog post         |
| DELETE | `/blog/:id`               | Admin  | Delete blog post         |

---

### Notifications

| Method | Path                        | Auth | Description              |
|--------|-----------------------------|------|--------------------------|
| GET    | `/notifications`            | Yes  | List notifications       |
| PATCH  | `/notifications/:id/read`   | Yes  | Mark as read             |
| PATCH  | `/notifications/read-all`   | Yes  | Mark all as read         |

---

### Settings (Admin)

| Method | Path                      | Auth   | Description              |
|--------|---------------------------|--------|--------------------------|
| GET    | `/admin/settings`         | Admin  | Get all settings         |
| PATCH  | `/admin/settings`         | Admin  | Update settings          |
| GET    | `/admin/dashboard`        | Admin  | Dashboard statistics     |
| GET    | `/admin/audit-logs`       | Admin  | Audit log (paginated)    |

---

## WebSocket Events

Connect to `ws://localhost:8080` with auth token.

### Server → Client

| Event              | Description                        |
|--------------------|------------------------------------|
| `bid:new`          | New bid placed on a product        |
| `bid:outbid`       | You have been outbid               |
| `auction:ending`   | Auction ending soon (anti-snipe)   |
| `auction:ended`    | Auction has ended                  |
| `notification:new` | New notification                   |
| `wallet:updated`   | Wallet balance changed             |

### Client → Server

| Event              | Description                        |
|--------------------|------------------------------------|
| `subscribe:product`| Subscribe to product bid updates   |
| `unsubscribe:product` | Unsubscribe from product        |
| `subscribe:user`   | Subscribe to user notifications    |
