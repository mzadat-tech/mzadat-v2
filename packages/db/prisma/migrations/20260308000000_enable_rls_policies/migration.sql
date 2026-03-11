-- ═══════════════════════════════════════════════════════════════════
-- Enable Row Level Security (RLS) on ALL tables + add policies
-- ═══════════════════════════════════════════════════════════════════
--
-- WHY: All tables were public with no RLS. The API uses service_role
-- (bypasses RLS), but the web/admin apps use the anon key which
-- MUST go through RLS to prevent unauthorized data access.
--
-- STRATEGY:
--   • Public data (categories, published products, blogs)  → SELECT for everyone
--   • User-owned data (orders, wallet, watchlist)          → scoped to auth.uid()
--   • Admin data (audit_log, settings mutations)           → admin/super_admin only
--   • Mutations on sensitive tables                        → service_role only (API)
--
-- The API server uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS entirely.
-- These policies protect against direct client-side Supabase calls.
-- ═══════════════════════════════════════════════════════════════════

-- ── Helper functions (in public schema — auth schema is Supabase-managed) ────

-- Get current user's role from the profiles table
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS "UserRole" AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is admin or super_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Grant execute to anon + authenticated roles (PostgREST uses these)
GRANT EXECUTE ON FUNCTION public.user_role() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;


-- ═══════════════════════════════════════════════════════════════════
-- ENABLE RLS ON ALL TABLES
-- ═══════════════════════════════════════════════════════════════════

-- Core tables (from Prisma schema)
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deleted_bid_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_payment_info ENABLE ROW LEVEL SECURITY;

-- CMS tables
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watermarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;


-- ═══════════════════════════════════════════════════════════════════
-- PUBLICLY READABLE TABLES (no auth needed for SELECT)
-- ═══════════════════════════════════════════════════════════════════

-- Location tables — always public
CREATE POLICY countries_select_all ON public.countries FOR SELECT USING (true);
CREATE POLICY states_select_all ON public.states FOR SELECT USING (true);
CREATE POLICY cities_select_all ON public.cities FOR SELECT USING (true);

-- Categories — always public
CREATE POLICY categories_select_all ON public.categories FOR SELECT USING (true);

-- Groups — always public (dates/status filtering done at app level)
CREATE POLICY groups_select_all ON public.groups FOR SELECT USING (true);

-- Stores — always public
CREATE POLICY stores_select_all ON public.stores FOR SELECT USING (true);

-- Currencies — always public
CREATE POLICY currencies_select_all ON public.currencies FOR SELECT USING (true);

-- Languages — always public
CREATE POLICY languages_select_all ON public.languages FOR SELECT USING (true);

-- Translations — always public
CREATE POLICY translations_select_all ON public.translations FOR SELECT USING (true);

-- Menus — always public
CREATE POLICY menus_select_all ON public.menus FOR SELECT USING (true);

-- Widgets — always public (active only)
CREATE POLICY widgets_select_active ON public.widgets FOR SELECT USING (status = 'active');

-- Site settings — always public for SELECT
CREATE POLICY site_settings_select_all ON public.site_settings FOR SELECT USING (true);

-- Payment methods — only active ones visible publicly
CREATE POLICY payment_methods_select_active ON public.payment_methods FOR SELECT USING (status = 'active');


-- ═══════════════════════════════════════════════════════════════════
-- PROFILES
-- ═══════════════════════════════════════════════════════════════════

-- Anyone can read non-deleted profiles (public info like store owners, bid names)
CREATE POLICY profiles_select_public ON public.profiles
  FOR SELECT USING (deleted_at IS NULL);

-- Users can update their own profile
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can update/insert any profile
CREATE POLICY profiles_admin_all ON public.profiles
  FOR ALL USING (public.is_admin());

-- Users can insert their own profile (registration)
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);


-- ═══════════════════════════════════════════════════════════════════
-- PRODUCTS
-- ═══════════════════════════════════════════════════════════════════

-- Anyone can view published, non-deleted products
CREATE POLICY products_select_public ON public.products
  FOR SELECT USING (status = 'published' AND deleted_at IS NULL);

-- Merchants can view ALL their own products (any status, for management)
CREATE POLICY products_select_own ON public.products
  FOR SELECT USING (merchant_id = auth.uid());

-- Admins can view all products
CREATE POLICY products_select_admin ON public.products
  FOR SELECT USING (public.is_admin());

-- Merchants can insert their own products
CREATE POLICY products_insert_merchant ON public.products
  FOR INSERT WITH CHECK (merchant_id = auth.uid());

-- Merchants can update their own products
CREATE POLICY products_update_merchant ON public.products
  FOR UPDATE USING (merchant_id = auth.uid())
  WITH CHECK (merchant_id = auth.uid());

-- Admins can do anything with products
CREATE POLICY products_admin_all ON public.products
  FOR ALL USING (public.is_admin());

-- Product galleries — follow product visibility
CREATE POLICY product_galleries_select ON public.product_galleries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id
        AND (
          (p.status = 'published' AND p.deleted_at IS NULL)
          OR p.merchant_id = auth.uid()
          OR public.is_admin()
        )
    )
  );

CREATE POLICY product_galleries_merchant ON public.product_galleries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id AND (p.merchant_id = auth.uid() OR public.is_admin())
    )
  );

-- Product specifications — follow product visibility
CREATE POLICY product_specs_select ON public.product_specifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id
        AND (
          (p.status = 'published' AND p.deleted_at IS NULL)
          OR p.merchant_id = auth.uid()
          OR public.is_admin()
        )
    )
  );

CREATE POLICY product_specs_merchant ON public.product_specifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id AND (p.merchant_id = auth.uid() OR public.is_admin())
    )
  );

-- Product reviews — anyone can read, users can insert their own
CREATE POLICY product_reviews_select ON public.product_reviews
  FOR SELECT USING (status = 'active');

CREATE POLICY product_reviews_insert ON public.product_reviews
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY product_reviews_admin ON public.product_reviews
  FOR ALL USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════════
-- ORDERS
-- ═══════════════════════════════════════════════════════════════════

-- Users see their own orders
CREATE POLICY orders_select_own ON public.orders
  FOR SELECT USING (user_id = auth.uid());

-- Merchants see orders for their products
CREATE POLICY orders_select_merchant ON public.orders
  FOR SELECT USING (merchant_id = auth.uid());

-- Admins see all orders
CREATE POLICY orders_select_admin ON public.orders
  FOR SELECT USING (public.is_admin());

-- Inserts/updates handled by API (service_role bypasses RLS)


-- ═══════════════════════════════════════════════════════════════════
-- BID HISTORY
-- ═══════════════════════════════════════════════════════════════════

-- Anyone can view non-deleted bids (names masked at app level)
CREATE POLICY bids_select_public ON public.bid_history
  FOR SELECT USING (deleted_at IS NULL);

-- Users can insert their own bids
CREATE POLICY bids_insert_own ON public.bid_history
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admins can manage bids
CREATE POLICY bids_admin_all ON public.bid_history
  FOR ALL USING (public.is_admin());

-- Deleted bid log — admin only
CREATE POLICY deleted_bid_log_admin ON public.deleted_bid_log
  FOR ALL USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════════
-- WALLET & FINANCE
-- ═══════════════════════════════════════════════════════════════════

-- Users see their own wallet transactions
CREATE POLICY wallet_tx_select_own ON public.wallet_transactions
  FOR SELECT USING (user_id = auth.uid());

-- Admins see all
CREATE POLICY wallet_tx_admin ON public.wallet_transactions
  FOR ALL USING (public.is_admin());

-- Bank deposits — users see their own
CREATE POLICY bank_deposits_select_own ON public.bank_deposits
  FOR SELECT USING (user_id = auth.uid());

-- Users can submit bank deposit proofs
CREATE POLICY bank_deposits_insert_own ON public.bank_deposits
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admins can manage all deposits
CREATE POLICY bank_deposits_admin ON public.bank_deposits
  FOR ALL USING (public.is_admin());

-- Withdrawals — users see their own
CREATE POLICY withdrawals_select_own ON public.withdrawals
  FOR SELECT USING (user_id = auth.uid());

-- Users can submit withdrawals
CREATE POLICY withdrawals_insert_own ON public.withdrawals
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admins can manage all withdrawals
CREATE POLICY withdrawals_admin ON public.withdrawals
  FOR ALL USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════════
-- NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════════════

-- Users see their own notifications
CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

-- Users can mark their own notifications as read
CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can manage all notifications
CREATE POLICY notifications_admin ON public.notifications
  FOR ALL USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════════
-- WATCHLIST
-- ═══════════════════════════════════════════════════════════════════

-- Users manage their own watchlist (all operations)
CREATE POLICY watchlist_own ON public.watchlist
  FOR ALL USING (user_id = auth.uid());


-- ═══════════════════════════════════════════════════════════════════
-- USER PAYMENT INFO
-- ═══════════════════════════════════════════════════════════════════

-- Users manage their own payment info
CREATE POLICY user_payment_info_own ON public.user_payment_info
  FOR ALL USING (user_id = auth.uid());

-- Admins can view all
CREATE POLICY user_payment_info_admin ON public.user_payment_info
  FOR ALL USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════════
-- SUPPORT TICKETS
-- ═══════════════════════════════════════════════════════════════════

-- Users see their own tickets
CREATE POLICY tickets_select_own ON public.support_tickets
  FOR SELECT USING (user_id = auth.uid());

-- Users can create tickets
CREATE POLICY tickets_insert_own ON public.support_tickets
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admins can manage all tickets
CREATE POLICY tickets_admin ON public.support_tickets
  FOR ALL USING (public.is_admin());

-- Ticket replies — users see replies on their tickets
CREATE POLICY ticket_replies_select_own ON public.ticket_replies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR public.is_admin())
    )
  );

-- Users can reply to their own tickets
CREATE POLICY ticket_replies_insert_own ON public.ticket_replies
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admins can manage all replies
CREATE POLICY ticket_replies_admin ON public.ticket_replies
  FOR ALL USING (public.is_admin());

-- Ticket attachments — follow ticket visibility
CREATE POLICY ticket_attachments_select ON public.ticket_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR public.is_admin())
    )
    OR
    EXISTS (
      SELECT 1 FROM public.ticket_replies r
      JOIN public.support_tickets t ON t.id = r.ticket_id
      WHERE r.id = reply_id AND (t.user_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY ticket_attachments_insert ON public.ticket_attachments
  FOR INSERT WITH CHECK (true); -- validated at API level

CREATE POLICY ticket_attachments_admin ON public.ticket_attachments
  FOR ALL USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════════
-- CORPORATE DOMAINS
-- ═══════════════════════════════════════════════════════════════════

-- Verified domains are publicly visible
CREATE POLICY corporate_domains_select ON public.corporate_domains
  FOR SELECT USING (is_verified = true AND status = 'active');

-- Admins can manage all
CREATE POLICY corporate_domains_admin ON public.corporate_domains
  FOR ALL USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════════
-- STORES
-- ═══════════════════════════════════════════════════════════════════

-- Merchants can manage their own stores
CREATE POLICY stores_manage_own ON public.stores
  FOR ALL USING (owner_id = auth.uid());

-- Admins can manage all stores
CREATE POLICY stores_admin ON public.stores
  FOR ALL USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════════
-- PAYMENT GATEWAYS & TRANSACTIONS
-- ═══════════════════════════════════════════════════════════════════

-- Payment gateways — admin only (credentials are sensitive)
CREATE POLICY payment_gateways_admin ON public.payment_gateways
  FOR ALL USING (public.is_admin());

-- Active gateways visible to authenticated users (for checkout UI)
CREATE POLICY payment_gateways_select_active ON public.payment_gateways
  FOR SELECT USING (is_active = true AND auth.uid() IS NOT NULL);

-- Payment transactions — users see their own
CREATE POLICY payment_tx_select_own ON public.payment_transactions
  FOR SELECT USING (user_id = auth.uid());

-- Admins see all tx
CREATE POLICY payment_tx_admin ON public.payment_transactions
  FOR ALL USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════════
-- CMS TABLES — public read, admin write
-- ═══════════════════════════════════════════════════════════════════

-- Blog categories — public read
CREATE POLICY blog_categories_select ON public.blog_categories
  FOR SELECT USING (true);
CREATE POLICY blog_categories_admin ON public.blog_categories
  FOR ALL USING (public.is_admin());

-- Blogs — published only for public, all for admin
CREATE POLICY blogs_select_published ON public.blogs
  FOR SELECT USING (status = 'published');
CREATE POLICY blogs_admin ON public.blogs
  FOR ALL USING (public.is_admin());

-- Blog comments — approved visible, users can insert
CREATE POLICY blog_comments_select ON public.blog_comments
  FOR SELECT USING (status = 'approved');
CREATE POLICY blog_comments_insert ON public.blog_comments
  FOR INSERT WITH CHECK (true); -- anonymous or logged in
CREATE POLICY blog_comments_admin ON public.blog_comments
  FOR ALL USING (public.is_admin());

-- Widgets — admin only for mutations (select handled above)
CREATE POLICY widgets_admin ON public.widgets
  FOR ALL USING (public.is_admin());

-- Menus — admin only for mutations (select handled above)
CREATE POLICY menus_admin ON public.menus
  FOR ALL USING (public.is_admin());

-- Email templates — admin only
CREATE POLICY email_templates_admin ON public.email_templates
  FOR ALL USING (public.is_admin());

-- Contacts — anyone can insert, admin can read
CREATE POLICY contacts_insert ON public.contacts
  FOR INSERT WITH CHECK (true);
CREATE POLICY contacts_admin ON public.contacts
  FOR ALL USING (public.is_admin());

-- Watermarks — admin only
CREATE POLICY watermarks_admin ON public.watermarks
  FOR ALL USING (public.is_admin());

-- Languages — admin only for mutations (select handled above)
CREATE POLICY languages_admin ON public.languages
  FOR ALL USING (public.is_admin());

-- Translations — admin only for mutations (select handled above)
CREATE POLICY translations_admin ON public.translations
  FOR ALL USING (public.is_admin());

-- Site settings — admin only for mutations (select handled above)
CREATE POLICY site_settings_admin ON public.site_settings
  FOR ALL USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════════
-- AUDIT LOG — admin only
-- ═══════════════════════════════════════════════════════════════════

CREATE POLICY audit_log_admin ON public.audit_log
  FOR ALL USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════════
-- CATEGORIES / GROUPS — admin-only for mutations
-- (select already handled above as public)
-- ═══════════════════════════════════════════════════════════════════

CREATE POLICY categories_admin ON public.categories
  FOR ALL USING (public.is_admin());

CREATE POLICY groups_admin ON public.groups
  FOR ALL USING (public.is_admin());

-- Merchants can manage their own groups
CREATE POLICY groups_manage_merchant ON public.groups
  FOR ALL USING (merchant_id = auth.uid());
