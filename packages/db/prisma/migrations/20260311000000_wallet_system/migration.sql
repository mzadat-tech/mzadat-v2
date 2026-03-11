-- Wallet System Migration
-- Adds: AdminBankAccount table, WalletTxType new values, WalletTxStatus new values,
--        reference_number + amount_encrypted to wallet_transactions

-- ═══════════════════════════════════════════
-- 1. Extend WalletTxType enum
-- ═══════════════════════════════════════════
ALTER TYPE "WalletTxType" ADD VALUE IF NOT EXISTS 'hold';
ALTER TYPE "WalletTxType" ADD VALUE IF NOT EXISTS 'release';
ALTER TYPE "WalletTxType" ADD VALUE IF NOT EXISTS 'fee';

-- ═══════════════════════════════════════════
-- 2. Extend WalletTxStatus enum
-- ═══════════════════════════════════════════
ALTER TYPE "WalletTxStatus" ADD VALUE IF NOT EXISTS 'on_hold';
ALTER TYPE "WalletTxStatus" ADD VALUE IF NOT EXISTS 'cancelled';

-- ═══════════════════════════════════════════
-- 3. Add new columns to wallet_transactions
-- ═══════════════════════════════════════════

-- reference_number — unique per transaction (WTX-2026-000001)
ALTER TABLE "wallet_transactions" ADD COLUMN "reference_number" TEXT;

-- Generate reference numbers for existing rows (if any)
DO $$
DECLARE
  r RECORD;
  seq INT := 0;
BEGIN
  FOR r IN SELECT id FROM wallet_transactions ORDER BY created_at ASC
  LOOP
    seq := seq + 1;
    UPDATE wallet_transactions
    SET reference_number = 'WTX-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(seq::TEXT, 6, '0')
    WHERE id = r.id;
  END LOOP;
END $$;

-- Now make it NOT NULL + UNIQUE
ALTER TABLE "wallet_transactions" ALTER COLUMN "reference_number" SET NOT NULL;
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_reference_number_key" UNIQUE ("reference_number");

-- Index on reference_number
CREATE INDEX IF NOT EXISTS "wallet_transactions_reference_number_idx" ON "wallet_transactions"("reference_number");

-- Encrypted amount for tamper detection
ALTER TABLE "wallet_transactions" ADD COLUMN "amount_encrypted" BYTEA;

-- ═══════════════════════════════════════════
-- 4. Create admin_bank_accounts table
-- ═══════════════════════════════════════════
CREATE TABLE "admin_bank_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bank_name" JSONB NOT NULL DEFAULT '{}',
    "account_name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "iban" TEXT NOT NULL,
    "swift_code" TEXT,
    "branch" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'OMR',
    "logo" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "admin_bank_accounts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_bank_accounts_status_idx" ON "admin_bank_accounts"("status");

-- ═══════════════════════════════════════════
-- 5. Create sequence for wallet transaction reference numbers
-- ═══════════════════════════════════════════
CREATE SEQUENCE IF NOT EXISTS wallet_tx_ref_seq START WITH 1 INCREMENT BY 1;

-- Set sequence to current max
DO $$
DECLARE
  max_seq INT;
BEGIN
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(reference_number, '-', 3) AS INT)
  ), 0) INTO max_seq FROM wallet_transactions;
  IF max_seq > 0 THEN
    PERFORM setval('wallet_tx_ref_seq', max_seq);
  END IF;
END $$;

-- ═══════════════════════════════════════════
-- 6. Enable RLS on new table + harden wallet tables
-- ═══════════════════════════════════════════

-- ── admin_bank_accounts ─────────────────────────────────
ALTER TABLE "admin_bank_accounts" ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can READ active bank accounts (public info for deposit page)
CREATE POLICY "admin_bank_accounts_select_active" ON "admin_bank_accounts"
  FOR SELECT USING (status = 'active');

-- Admins can do everything (CRUD)
CREATE POLICY "admin_bank_accounts_admin_all" ON "admin_bank_accounts"
  FOR ALL USING (public.is_admin());

-- ── Extra wallet_transactions protections ───────────────
-- Ensure users CANNOT update/delete their own transactions directly
-- (mutations only via service_role through the API)
-- The existing RLS migration already has:
--   wallet_tx_select_own: SELECT where user_id = auth.uid()
--   wallet_tx_admin: ALL for admins
-- No INSERT/UPDATE/DELETE policy for regular users → they can't mutate directly.

-- ── Extra bank_deposits protections ─────────────────────
-- Users can only INSERT (submit proof) but NOT update/delete
-- The existing migration already handles this correctly:
--   bank_deposits_select_own + bank_deposits_insert_own + bank_deposits_admin

-- ── Extra withdrawals protections ───────────────────────
-- Same pattern — users can insert but not modify
-- Already handled by existing policies.
