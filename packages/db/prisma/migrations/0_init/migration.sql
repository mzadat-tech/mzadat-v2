-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('customer', 'merchant', 'admin', 'super_admin');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'inactive', 'suspended', 'pending_verification');

-- CreateEnum
CREATE TYPE "RegisterType" AS ENUM ('individual', 'company');

-- CreateEnum
CREATE TYPE "ProductSaleType" AS ENUM ('auction', 'direct');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('draft', 'pending', 'published', 'inactive', 'closed');

-- CreateEnum
CREATE TYPE "ProductScheduleType" AS ENUM ('default', 'scheduled');

-- CreateEnum
CREATE TYPE "DepositType" AS ENUM ('fixed', 'percentage');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('bid', 'purchase');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('processing', 'win', 'rejected', 'completed', 'on_hold', 'delivered', 'refunded', 'shipped');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('partial', 'unpaid', 'paid');

-- CreateEnum
CREATE TYPE "WalletTxType" AS ENUM ('deposit', 'bid', 'purchase', 'withdraw', 'return', 'refund', 'bid_final_payment', 'admin_adjustment', 'commission');

-- CreateEnum
CREATE TYPE "WalletTxStatus" AS ENUM ('pending', 'completed', 'rejected');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "GroupStatus" AS ENUM ('upcoming', 'active', 'closed', 'cancelled');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('active', 'inactive');

-- CreateTable
CREATE TABLE "countries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" JSONB NOT NULL DEFAULT '{}',
    "code" TEXT NOT NULL,
    "phone_code" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'active',

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "states" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "country_id" UUID NOT NULL,
    "name" JSONB NOT NULL DEFAULT '{}',
    "code" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'active',

    CONSTRAINT "states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "state_id" UUID NOT NULL,
    "name" JSONB NOT NULL DEFAULT '{}',
    "status" "ContentStatus" NOT NULL DEFAULT 'active',

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_domains" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "domain" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "company_name_ar" TEXT,
    "admin_user_id" UUID,
    "max_bid_limit" DECIMAL(12,3),
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "status" "ContentStatus" NOT NULL DEFAULT 'inactive',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corporate_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "custom_id" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'customer',
    "status" "UserStatus" NOT NULL DEFAULT 'pending_verification',
    "register_as" "RegisterType" NOT NULL DEFAULT 'individual',
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "first_name_ar" TEXT,
    "last_name_ar" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "image" TEXT,
    "individual_id" TEXT,
    "company_name" TEXT,
    "company_id" TEXT,
    "country_id" UUID,
    "state_id" UUID,
    "city_id" UUID,
    "address" TEXT,
    "zip_code" TEXT,
    "is_vip" BOOLEAN NOT NULL DEFAULT false,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "wallet_balance" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    "corporate_domain_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" JSONB NOT NULL DEFAULT '{}',
    "description" JSONB DEFAULT '{}',
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "logo" TEXT,
    "cover_image" TEXT,
    "social_links" JSONB DEFAULT '{}',
    "commission_rate" DECIMAL(5,2) DEFAULT 0.00,
    "vat_applicable" BOOLEAN NOT NULL DEFAULT false,
    "vat_rate" DECIMAL(5,2) DEFAULT 5.00,
    "status" "ContentStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "parent_id" UUID,
    "slug" TEXT NOT NULL,
    "name" JSONB NOT NULL DEFAULT '{}',
    "description" JSONB DEFAULT '{}',
    "image" TEXT,
    "icon" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID,
    "merchant_id" UUID NOT NULL,
    "name" JSONB NOT NULL DEFAULT '{}',
    "description" JSONB DEFAULT '{}',
    "image" TEXT,
    "start_date" TIMESTAMPTZ NOT NULL,
    "end_date" TIMESTAMPTZ NOT NULL,
    "inspection_start_date" TIMESTAMPTZ,
    "inspection_end_date" TIMESTAMPTZ,
    "min_deposit" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    "status" "GroupStatus" NOT NULL DEFAULT 'upcoming',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "merchant_id" UUID NOT NULL,
    "store_id" UUID,
    "category_id" UUID,
    "group_id" UUID,
    "slug" TEXT NOT NULL,
    "name" JSONB NOT NULL DEFAULT '{}',
    "description" JSONB DEFAULT '{}',
    "short_description" JSONB DEFAULT '{}',
    "feature_image" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "sale_type" "ProductSaleType" NOT NULL DEFAULT 'auction',
    "schedule_type" "ProductScheduleType" NOT NULL DEFAULT 'default',
    "price" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    "sale_price" DECIMAL(12,3),
    "min_bid_price" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    "reserve_price" DECIMAL(12,3),
    "current_bid" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    "bid_increment_1" DECIMAL(12,3) NOT NULL DEFAULT 1.000,
    "bid_increment_2" DECIMAL(12,3),
    "bid_increment_3" DECIMAL(12,3),
    "bid_increment_4" DECIMAL(12,3),
    "min_deposit" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    "min_deposit_type" "DepositType" NOT NULL DEFAULT 'fixed',
    "start_date" TIMESTAMPTZ,
    "end_date" TIMESTAMPTZ,
    "original_end_date" TIMESTAMPTZ,
    "snipe_extension_seconds" INTEGER NOT NULL DEFAULT 120,
    "max_snipe_extension_minutes" INTEGER NOT NULL DEFAULT 30,
    "total_extensions" INTEGER NOT NULL DEFAULT 0,
    "location" TEXT,
    "inspection_notes" TEXT,
    "meta_title" JSONB DEFAULT '{}',
    "meta_keywords" JSONB DEFAULT '{}',
    "meta_description" JSONB DEFAULT '{}',
    "bid_count" INTEGER NOT NULL DEFAULT 0,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "status" "ProductStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_galleries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "image" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_galleries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_specifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "label" JSONB NOT NULL DEFAULT '{}',
    "value" JSONB NOT NULL DEFAULT '{}',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_specifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "rating" SMALLINT NOT NULL,
    "comment" TEXT,
    "admin_reply" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_number" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "group_id" UUID,
    "type" "OrderType" NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'processing',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'unpaid',
    "bid_amount" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    "amount" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    "tax_amount" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    "commission_amount" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    "total_amount" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    "deposit_amount" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    "deposit_paid" BOOLEAN NOT NULL DEFAULT false,
    "billing_name" TEXT,
    "billing_email" TEXT,
    "billing_phone" TEXT,
    "billing_address" TEXT,
    "billing_country" UUID,
    "billing_state" UUID,
    "billing_city" UUID,
    "shipping_name" TEXT,
    "shipping_address" TEXT,
    "shipping_country" UUID,
    "shipping_state" UUID,
    "shipping_city" UUID,
    "is_restricted" BOOLEAN NOT NULL DEFAULT false,
    "payment_method" TEXT,
    "transaction_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bid_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID,
    "user_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "amount" DECIMAL(12,3) NOT NULL,
    "order_number" TEXT,
    "is_winning" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "bid_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deleted_bid_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bid_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount" DECIMAL(12,3) NOT NULL,
    "deleted_by" UUID NOT NULL,
    "reason" TEXT,
    "original_data" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deleted_bid_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "order_id" UUID,
    "product_id" UUID,
    "type" "WalletTxType" NOT NULL,
    "status" "WalletTxStatus" NOT NULL DEFAULT 'pending',
    "amount" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    "admin_commission" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    "merchant_amount" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    "tax_amount" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    "total_amount" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    "payment_method" TEXT,
    "transaction_id" TEXT,
    "gateway_amount" DECIMAL(12,3),
    "currency" TEXT DEFAULT 'OMR',
    "proof_document" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_deposits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "wallet_tx_id" UUID,
    "amount" DECIMAL(12,3) NOT NULL,
    "proof_document" TEXT NOT NULL,
    "bank_name" TEXT,
    "reference_number" TEXT,
    "status" "WalletTxStatus" NOT NULL DEFAULT 'pending',
    "admin_notes" TEXT,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "amount" DECIMAL(12,3) NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "account_holder" TEXT NOT NULL,
    "iban" TEXT,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'pending',
    "admin_notes" TEXT,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticket_number" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "department" TEXT,
    "priority" "TicketPriority" NOT NULL DEFAULT 'medium',
    "status" "TicketStatus" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ,
    "closed_at" TIMESTAMPTZ,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_replies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticket_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "is_admin_reply" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticket_id" UUID,
    "reply_id" UUID,
    "file_path" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_gateways" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" JSONB NOT NULL DEFAULT '{}',
    "code" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "logo" TEXT,
    "description" JSONB DEFAULT '{}',
    "credentials_encrypted" BYTEA,
    "is_sandbox" BOOLEAN NOT NULL DEFAULT true,
    "supported_currencies" TEXT[] DEFAULT ARRAY['OMR']::TEXT[],
    "supported_methods" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "webhook_url" TEXT,
    "extra_settings" JSONB DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "last_tested_at" TIMESTAMPTZ,
    "last_test_result" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_gateways_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gateway_id" UUID NOT NULL,
    "gateway_code" TEXT NOT NULL,
    "external_id" TEXT,
    "order_id" UUID,
    "user_id" UUID,
    "amount" DECIMAL(12,3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'OMR',
    "gateway_fee" DECIMAL(12,3),
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_code" TEXT,
    "error_message" TEXT,
    "gateway_request" JSONB,
    "gateway_response" JSONB,
    "metadata" JSONB DEFAULT '{}',
    "ip_address" TEXT,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "method_name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "credentials" JSONB DEFAULT '{}',
    "is_sandbox" BOOLEAN NOT NULL DEFAULT true,
    "currency" TEXT DEFAULT 'OMR',
    "logo" TEXT,
    "extra_settings" JSONB DEFAULT '{}',
    "status" "ContentStatus" NOT NULL DEFAULT 'inactive',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currencies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "exchange_rate" DECIMAL(12,6) NOT NULL DEFAULT 1.000000,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "status" "ContentStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" JSONB NOT NULL DEFAULT '{}',
    "body" JSONB NOT NULL DEFAULT '{}',
    "data" JSONB DEFAULT '{}',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_payment_info" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "bank_name" TEXT,
    "account_number" TEXT,
    "account_holder" TEXT,
    "iban" TEXT,
    "swift_code" TEXT,
    "paypal_email" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_payment_info_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "countries_code_key" ON "countries"("code");

-- CreateIndex
CREATE INDEX "states_country_id_idx" ON "states"("country_id");

-- CreateIndex
CREATE INDEX "cities_state_id_idx" ON "cities"("state_id");

-- CreateIndex
CREATE UNIQUE INDEX "corporate_domains_domain_key" ON "corporate_domains"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_custom_id_key" ON "profiles"("custom_id");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE INDEX "profiles_role_idx" ON "profiles"("role");

-- CreateIndex
CREATE INDEX "profiles_status_idx" ON "profiles"("status");

-- CreateIndex
CREATE INDEX "profiles_email_idx" ON "profiles"("email");

-- CreateIndex
CREATE INDEX "profiles_custom_id_idx" ON "profiles"("custom_id");

-- CreateIndex
CREATE INDEX "profiles_corporate_domain_id_idx" ON "profiles"("corporate_domain_id");

-- CreateIndex
CREATE UNIQUE INDEX "stores_slug_key" ON "stores"("slug");

-- CreateIndex
CREATE INDEX "stores_owner_id_idx" ON "stores"("owner_id");

-- CreateIndex
CREATE INDEX "stores_slug_idx" ON "stores"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parent_id_idx" ON "categories"("parent_id");

-- CreateIndex
CREATE INDEX "categories_slug_idx" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_status_idx" ON "categories"("status");

-- CreateIndex
CREATE INDEX "groups_store_id_idx" ON "groups"("store_id");

-- CreateIndex
CREATE INDEX "groups_merchant_id_idx" ON "groups"("merchant_id");

-- CreateIndex
CREATE INDEX "groups_status_idx" ON "groups"("status");

-- CreateIndex
CREATE INDEX "groups_start_date_end_date_idx" ON "groups"("start_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_merchant_id_idx" ON "products"("merchant_id");

-- CreateIndex
CREATE INDEX "products_category_id_idx" ON "products"("category_id");

-- CreateIndex
CREATE INDEX "products_group_id_idx" ON "products"("group_id");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE INDEX "products_sale_type_idx" ON "products"("sale_type");

-- CreateIndex
CREATE INDEX "products_slug_idx" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_start_date_end_date_idx" ON "products"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "products_status_sale_type_start_date_end_date_idx" ON "products"("status", "sale_type", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "products_deleted_at_created_at_idx" ON "products"("deleted_at", "created_at" DESC);

-- CreateIndex
CREATE INDEX "product_galleries_product_id_idx" ON "product_galleries"("product_id");

-- CreateIndex
CREATE INDEX "product_specifications_product_id_idx" ON "product_specifications"("product_id");

-- CreateIndex
CREATE INDEX "product_reviews_product_id_idx" ON "product_reviews"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_user_id_idx" ON "orders"("user_id");

-- CreateIndex
CREATE INDEX "orders_product_id_idx" ON "orders"("product_id");

-- CreateIndex
CREATE INDEX "orders_merchant_id_idx" ON "orders"("merchant_id");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_order_number_idx" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_type_idx" ON "orders"("type");

-- CreateIndex
CREATE INDEX "bid_history_product_id_idx" ON "bid_history"("product_id");

-- CreateIndex
CREATE INDEX "bid_history_user_id_idx" ON "bid_history"("user_id");

-- CreateIndex
CREATE INDEX "bid_history_product_id_amount_idx" ON "bid_history"("product_id", "amount" DESC);

-- CreateIndex
CREATE INDEX "bid_history_product_id_is_winning_idx" ON "bid_history"("product_id", "is_winning");

-- CreateIndex
CREATE INDEX "wallet_transactions_user_id_idx" ON "wallet_transactions"("user_id");

-- CreateIndex
CREATE INDEX "wallet_transactions_type_idx" ON "wallet_transactions"("type");

-- CreateIndex
CREATE INDEX "wallet_transactions_status_idx" ON "wallet_transactions"("status");

-- CreateIndex
CREATE INDEX "wallet_transactions_order_id_idx" ON "wallet_transactions"("order_id");

-- CreateIndex
CREATE INDEX "wallet_transactions_created_at_idx" ON "wallet_transactions"("created_at" DESC);

-- CreateIndex
CREATE INDEX "bank_deposits_user_id_idx" ON "bank_deposits"("user_id");

-- CreateIndex
CREATE INDEX "bank_deposits_status_idx" ON "bank_deposits"("status");

-- CreateIndex
CREATE INDEX "withdrawals_user_id_idx" ON "withdrawals"("user_id");

-- CreateIndex
CREATE INDEX "withdrawals_status_idx" ON "withdrawals"("status");

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_ticket_number_key" ON "support_tickets"("ticket_number");

-- CreateIndex
CREATE INDEX "support_tickets_user_id_idx" ON "support_tickets"("user_id");

-- CreateIndex
CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");

-- CreateIndex
CREATE INDEX "support_tickets_ticket_number_idx" ON "support_tickets"("ticket_number");

-- CreateIndex
CREATE INDEX "ticket_replies_ticket_id_idx" ON "ticket_replies"("ticket_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_gateways_code_key" ON "payment_gateways"("code");

-- CreateIndex
CREATE INDEX "payment_gateways_code_idx" ON "payment_gateways"("code");

-- CreateIndex
CREATE INDEX "payment_gateways_is_active_idx" ON "payment_gateways"("is_active");

-- CreateIndex
CREATE INDEX "payment_transactions_gateway_id_idx" ON "payment_transactions"("gateway_id");

-- CreateIndex
CREATE INDEX "payment_transactions_gateway_code_idx" ON "payment_transactions"("gateway_code");

-- CreateIndex
CREATE INDEX "payment_transactions_external_id_idx" ON "payment_transactions"("external_id");

-- CreateIndex
CREATE INDEX "payment_transactions_order_id_idx" ON "payment_transactions"("order_id");

-- CreateIndex
CREATE INDEX "payment_transactions_user_id_idx" ON "payment_transactions"("user_id");

-- CreateIndex
CREATE INDEX "payment_transactions_status_idx" ON "payment_transactions"("status");

-- CreateIndex
CREATE INDEX "payment_transactions_created_at_idx" ON "payment_transactions"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_slug_key" ON "payment_methods"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "currencies_code_key" ON "currencies"("code");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_log_user_id_idx" ON "audit_log"("user_id");

-- CreateIndex
CREATE INDEX "audit_log_entity_type_entity_id_idx" ON "audit_log"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_log_action_idx" ON "audit_log"("action");

-- CreateIndex
CREATE INDEX "audit_log_created_at_idx" ON "audit_log"("created_at" DESC);

-- CreateIndex
CREATE INDEX "watchlist_user_id_idx" ON "watchlist"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_user_id_product_id_key" ON "watchlist"("user_id", "product_id");

-- CreateIndex
CREATE INDEX "user_payment_info_user_id_idx" ON "user_payment_info"("user_id");

-- AddForeignKey
ALTER TABLE "states" ADD CONSTRAINT "states_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cities" ADD CONSTRAINT "cities_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_domains" ADD CONSTRAINT "corporate_domains_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_corporate_domain_id_fkey" FOREIGN KEY ("corporate_domain_id") REFERENCES "corporate_domains"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_galleries" ADD CONSTRAINT "product_galleries_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_specifications" ADD CONSTRAINT "product_specifications_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_billing_country_fkey" FOREIGN KEY ("billing_country") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_billing_state_fkey" FOREIGN KEY ("billing_state") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_billing_city_fkey" FOREIGN KEY ("billing_city") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_shipping_country_fkey" FOREIGN KEY ("shipping_country") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_shipping_state_fkey" FOREIGN KEY ("shipping_state") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_shipping_city_fkey" FOREIGN KEY ("shipping_city") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_history" ADD CONSTRAINT "bid_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_history" ADD CONSTRAINT "bid_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_history" ADD CONSTRAINT "bid_history_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_history" ADD CONSTRAINT "bid_history_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deleted_bid_log" ADD CONSTRAINT "deleted_bid_log_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_deposits" ADD CONSTRAINT "bank_deposits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_deposits" ADD CONSTRAINT "bank_deposits_wallet_tx_id_fkey" FOREIGN KEY ("wallet_tx_id") REFERENCES "wallet_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_deposits" ADD CONSTRAINT "bank_deposits_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_replies" ADD CONSTRAINT "ticket_replies_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_replies" ADD CONSTRAINT "ticket_replies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_reply_id_fkey" FOREIGN KEY ("reply_id") REFERENCES "ticket_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_gateway_id_fkey" FOREIGN KEY ("gateway_id") REFERENCES "payment_gateways"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_payment_info" ADD CONSTRAINT "user_payment_info_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

