-- Wallet Encryption Migration
-- Adds: wallet_balance_encrypted to profiles, amount_encrypted to bank_deposits & withdrawals
-- Creates: Postgres helper functions for atomic encrypt-and-update operations

-- ═══════════════════════════════════════════
-- 1. Add encrypted BYTEA columns (tamper-detection mirrors)
-- ═══════════════════════════════════════════

ALTER TABLE "profiles" ADD COLUMN "wallet_balance_encrypted" BYTEA;
ALTER TABLE "bank_deposits" ADD COLUMN "amount_encrypted" BYTEA;
ALTER TABLE "withdrawals" ADD COLUMN "amount_encrypted" BYTEA;

-- ═══════════════════════════════════════════
-- 2. Postgres functions for atomic encrypt+update
--    These run inside the DB so the encryption key is never stored,
--    only passed per-call from the application layer.
-- ═══════════════════════════════════════════

-- Update a profile's wallet balance with encrypted copy in a single atomic operation
CREATE OR REPLACE FUNCTION public.update_wallet_balance(
  p_user_id UUID,
  p_new_balance DECIMAL(12,3),
  p_encryption_key TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  UPDATE profiles
  SET wallet_balance = p_new_balance,
      wallet_balance_encrypted = pgp_sym_encrypt(p_new_balance::text, p_encryption_key),
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;

-- Increment/decrement a profile's wallet balance with encrypted copy
CREATE OR REPLACE FUNCTION public.adjust_wallet_balance(
  p_user_id UUID,
  p_amount DECIMAL(12,3),
  p_is_credit BOOLEAN,
  p_encryption_key TEXT
) RETURNS DECIMAL(12,3)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_new_balance DECIMAL(12,3);
BEGIN
  IF p_is_credit THEN
    UPDATE profiles
    SET wallet_balance = wallet_balance + p_amount,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING wallet_balance INTO v_new_balance;
  ELSE
    UPDATE profiles
    SET wallet_balance = wallet_balance - p_amount,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING wallet_balance INTO v_new_balance;
  END IF;

  UPDATE profiles
  SET wallet_balance_encrypted = pgp_sym_encrypt(v_new_balance::text, p_encryption_key)
  WHERE id = p_user_id;

  RETURN v_new_balance;
END;
$$;

-- Verify wallet balance integrity (compare plaintext vs encrypted)
CREATE OR REPLACE FUNCTION public.verify_wallet_balance(
  p_user_id UUID,
  p_encryption_key TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_balance TEXT;
  v_decrypted TEXT;
BEGIN
  SELECT wallet_balance::text,
         CASE WHEN wallet_balance_encrypted IS NOT NULL
              THEN pgp_sym_decrypt(wallet_balance_encrypted, p_encryption_key)
              ELSE NULL
         END
  INTO v_balance, v_decrypted
  FROM profiles
  WHERE id = p_user_id;

  IF v_decrypted IS NULL THEN
    RETURN TRUE; -- No encrypted copy yet, skip check
  END IF;

  RETURN v_balance = v_decrypted;
END;
$$;

-- ═══════════════════════════════════════════
-- 3. Backfill encrypted values for existing rows that have balances
--    This requires the ENCRYPTION_KEY which is passed by the app.
--    We can't do this in a migration, so we create a function
--    that the app can call once after deployment.
-- ═══════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.backfill_wallet_encryption(
  p_encryption_key TEXT
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Backfill profiles
  UPDATE profiles
  SET wallet_balance_encrypted = pgp_sym_encrypt(wallet_balance::text, p_encryption_key)
  WHERE wallet_balance_encrypted IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Backfill bank_deposits
  UPDATE bank_deposits
  SET amount_encrypted = pgp_sym_encrypt(amount::text, p_encryption_key)
  WHERE amount_encrypted IS NULL;

  -- Backfill withdrawals
  UPDATE withdrawals
  SET amount_encrypted = pgp_sym_encrypt(amount::text, p_encryption_key)
  WHERE amount_encrypted IS NULL;

  -- Backfill wallet_transactions that are missing encrypted amounts
  UPDATE wallet_transactions
  SET amount_encrypted = pgp_sym_encrypt(amount::text, p_encryption_key)
  WHERE amount_encrypted IS NULL;

  RETURN v_count;
END;
$$;
