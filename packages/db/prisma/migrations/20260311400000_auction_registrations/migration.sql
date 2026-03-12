-- Auction Registrations (Group Deposit Payments)
-- Users register for a GROUP by paying a deposit. This unlocks bidding on ALL lots in that group.
-- VIP users get 100% discount (free registration).

CREATE TABLE IF NOT EXISTS "auction_registrations" (
  "id"              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "order_number"    TEXT NOT NULL UNIQUE,               -- MZD-2026-NNNN
  "user_id"         UUID NOT NULL REFERENCES "profiles"("id"),
  "group_id"        UUID NOT NULL REFERENCES "groups"("id"),
  "merchant_id"     UUID NOT NULL REFERENCES "profiles"("id"),

  -- Amounts (OMR, 3 decimal precision)
  "deposit_amount"  DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  "discount_amount" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  "tax_amount"      DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  "total_amount"    DECIMAL(12,3) NOT NULL DEFAULT 0.000,

  -- Payment
  "payment_method"  TEXT NOT NULL DEFAULT 'wallet',
  "payment_status"  TEXT NOT NULL DEFAULT 'paid',       -- paid | free
  "is_vip_free"     BOOLEAN NOT NULL DEFAULT FALSE,

  -- Billing snapshot
  "billing_name"    TEXT,
  "billing_email"   TEXT,
  "billing_phone"   TEXT,
  "billing_address" TEXT,

  -- Wallet transaction reference
  "wallet_tx_id"    UUID UNIQUE,

  "status"          TEXT NOT NULL DEFAULT 'active',     -- active | refunded | cancelled
  "notes"           TEXT,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One registration per user per group
  UNIQUE("user_id", "group_id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_auction_reg_user"     ON "auction_registrations"("user_id");
CREATE INDEX IF NOT EXISTS "idx_auction_reg_group"    ON "auction_registrations"("group_id");
CREATE INDEX IF NOT EXISTS "idx_auction_reg_merchant" ON "auction_registrations"("merchant_id");
CREATE INDEX IF NOT EXISTS "idx_auction_reg_order"    ON "auction_registrations"("order_number");
CREATE INDEX IF NOT EXISTS "idx_auction_reg_status"   ON "auction_registrations"("status");

-- RLS Policies
ALTER TABLE "auction_registrations" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own registrations"
  ON "auction_registrations"
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on registrations"
  ON "auction_registrations"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
