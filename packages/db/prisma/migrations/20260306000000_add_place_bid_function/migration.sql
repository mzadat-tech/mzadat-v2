-- place_bid: Atomic bid placement function
--
-- Runs as a single DB call with row-level locking (SELECT ... FOR UPDATE)
-- so concurrent bids on the same product are serialized at the row level.
-- Returns a JSON object with the bid result or raises an exception on failure.
--
-- Usage:  SELECT place_bid('user-uuid', 'product-uuid', 15.500);

CREATE OR REPLACE FUNCTION place_bid(
  p_user_id       UUID,
  p_product_id    UUID,
  p_amount        NUMERIC(12,3),
  p_snipe_ext_s   INT DEFAULT 120,    -- fallback snipe extension seconds
  p_max_snipe_m   INT DEFAULT 30      -- fallback max snipe extension minutes
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_product       RECORD;
  v_current_bid   NUMERIC(12,3);
  v_min_bid_price NUMERIC(12,3);
  v_increment     NUMERIC(12,3);
  v_minimum_bid   NUMERIC(12,3);
  v_bid_id        UUID;
  v_now           TIMESTAMPTZ := NOW();
  v_time_to_end   BIGINT;
  v_snipe_window  BIGINT;
  v_max_ext_ms    BIGINT;
  v_total_ext_ms  BIGINT;
  v_extension_ms  BIGINT;
  v_new_end_date  TIMESTAMPTZ;
  v_is_extended   BOOLEAN := FALSE;
  v_created_at    TIMESTAMPTZ;
BEGIN
  -- ─── 1. Lock & load the product row ────────────────────────
  SELECT
    id, merchant_id, sale_type, status,
    start_date, end_date, original_end_date,
    current_bid, min_bid_price, price,
    bid_increment_1, bid_increment_2, bid_increment_3, bid_increment_4,
    snipe_extension_seconds, max_snipe_extension_minutes,
    total_extensions, group_id
  INTO v_product
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;  -- row-level lock: serializes concurrent bids on same product

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found' USING ERRCODE = 'P0001';
  END IF;

  IF v_product.sale_type != 'auction' THEN
    RAISE EXCEPTION 'Product is not an auction' USING ERRCODE = 'P0001';
  END IF;

  IF v_product.status != 'published' THEN
    RAISE EXCEPTION 'Auction is not active' USING ERRCODE = 'P0001';
  END IF;

  IF v_product.merchant_id = p_user_id THEN
    RAISE EXCEPTION 'Cannot bid on your own product' USING ERRCODE = 'P0001';
  END IF;

  -- ─── 2. Check auction is live ──────────────────────────────
  IF v_product.start_date IS NOT NULL AND v_now < v_product.start_date THEN
    RAISE EXCEPTION 'Auction has not started yet' USING ERRCODE = 'P0001';
  END IF;

  IF v_product.end_date IS NOT NULL AND v_now > v_product.end_date THEN
    RAISE EXCEPTION 'Auction has ended' USING ERRCODE = 'P0001';
  END IF;

  -- ─── 3. Validate bid amount ────────────────────────────────
  v_current_bid   := COALESCE(v_product.current_bid, 0);
  v_min_bid_price := COALESCE(v_product.min_bid_price, 0);

  -- Use primary increment (bid_increment_1); tiered logic can be added later
  v_increment := COALESCE(v_product.bid_increment_1, 1.000);

  IF v_current_bid > 0 THEN
    v_minimum_bid := v_current_bid + v_increment;
  ELSE
    v_minimum_bid := v_min_bid_price;
  END IF;

  IF p_amount < v_minimum_bid THEN
    RAISE EXCEPTION 'Bid must be at least % OMR (current: %, increment: %)',
      v_minimum_bid, v_current_bid, v_increment
      USING ERRCODE = 'P0001';
  END IF;

  -- ─── 4. Unmark previous winning bid ────────────────────────
  UPDATE bid_history
  SET    is_winning = FALSE
  WHERE  product_id = p_product_id
    AND  is_winning = TRUE;

  -- ─── 5. Create the bid ─────────────────────────────────────
  INSERT INTO bid_history (user_id, product_id, merchant_id, amount, is_winning, created_at)
  VALUES (p_user_id, p_product_id, v_product.merchant_id, p_amount, TRUE, v_now)
  RETURNING id, created_at INTO v_bid_id, v_created_at;

  -- ─── 6. Update product currentBid & bidCount ───────────────
  UPDATE products
  SET    current_bid = p_amount,
         bid_count   = bid_count + 1,
         updated_at  = v_now
  WHERE  id = p_product_id;

  -- ─── 7. Anti-sniping extension ─────────────────────────────
  IF v_product.end_date IS NOT NULL THEN
    -- Time remaining in milliseconds
    v_time_to_end := EXTRACT(EPOCH FROM (v_product.end_date - v_now))::BIGINT * 1000;

    -- Snipe window in milliseconds
    v_snipe_window := COALESCE(v_product.snipe_extension_seconds, p_snipe_ext_s)::BIGINT * 1000;

    IF v_time_to_end > 0 AND v_time_to_end <= v_snipe_window THEN
      -- Max total extension allowed (ms)
      v_max_ext_ms := COALESCE(v_product.max_snipe_extension_minutes, p_max_snipe_m)::BIGINT * 60 * 1000;

      -- How much we've already extended
      v_total_ext_ms := EXTRACT(EPOCH FROM (
        v_product.end_date - COALESCE(v_product.original_end_date, v_product.end_date)
      ))::BIGINT * 1000;

      IF v_total_ext_ms < v_max_ext_ms THEN
        v_extension_ms := COALESCE(v_product.snipe_extension_seconds, p_snipe_ext_s)::BIGINT * 1000;
        v_new_end_date := v_product.end_date + (v_extension_ms || ' milliseconds')::INTERVAL;

        UPDATE products
        SET    end_date         = v_new_end_date,
               total_extensions = total_extensions + 1,
               updated_at       = v_now
        WHERE  id = p_product_id;

        v_is_extended := TRUE;
      END IF;
    END IF;
  END IF;

  -- ─── 8. Return result as JSONB ─────────────────────────────
  RETURN jsonb_build_object(
    'bidId',        v_bid_id,
    'amount',       p_amount::TEXT,
    'isExtended',   v_is_extended,
    'newEndDate',   CASE WHEN v_is_extended THEN v_new_end_date::TEXT ELSE NULL END,
    'productId',    p_product_id,
    'groupId',      v_product.group_id,
    'merchantId',   v_product.merchant_id,
    'createdAt',    v_created_at::TEXT
  );
END;
$$;
