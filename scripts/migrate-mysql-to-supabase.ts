/**
 * MySQL to Supabase/Prisma Migration Script
 *
 * This script reads data from the legacy MySQL database (mzadat_mzadat.sql dump)
 * and migrates it to the new Supabase PostgreSQL database via Prisma.
 *
 * Prerequisites:
 *   1. Prisma schema migrated to Supabase (pnpm db:migrate:deploy)
 *   2. MySQL dump loaded into a local or remote MySQL instance
 *   3. Environment variables set for both databases
 *
 * Usage:
 *   pnpm tsx scripts/migrate-mysql-to-supabase.ts
 *
 * Environment Variables:
 *   MYSQL_HOST     - Legacy MySQL host
 *   MYSQL_PORT     - Legacy MySQL port (default: 3306)
 *   MYSQL_USER     - Legacy MySQL user
 *   MYSQL_PASSWORD - Legacy MySQL password
 *   MYSQL_DATABASE - Legacy MySQL database name
 *   DATABASE_URL   - Supabase/Prisma connection string
 */

import { PrismaClient } from '@mzadat/db';
import type { ProductStatus, UserStatus, OrderStatus } from '@mzadat/db';

const prisma = new PrismaClient();

// ────────────────────────────────────────────────────────────
// Mapping helpers
// ────────────────────────────────────────────────────────────

/**
 * Convert MySQL tinyint(1) to boolean
 */
function toBool(val: number | null): boolean {
  return val === 1;
}

/**
 * Convert legacy status string to the new enum value
 */
function mapProductStatus(legacy: string): ProductStatus {
  const statusMap: Record<string, ProductStatus> = {
    draft: 'draft',
    pending: 'pending',
    approved: 'published',
    live: 'published',
    closed: 'closed',
    sold: 'closed',
    completed: 'closed',
    rejected: 'inactive',
    cancelled: 'inactive',
    expired: 'closed',
    relisted: 'draft',
  };
  return statusMap[legacy.toLowerCase()] ?? 'draft';
}

function mapUserStatus(legacy: string): UserStatus {
  const statusMap: Record<string, UserStatus> = {
    active: 'active',
    inactive: 'inactive',
    suspended: 'suspended',
    banned: 'suspended',
    pending: 'pending_verification',
  };
  return statusMap[legacy.toLowerCase()] ?? 'active';
}

function mapOrderStatus(legacy: string): OrderStatus {
  const statusMap: Record<string, OrderStatus> = {
    pending: 'processing',
    paid: 'completed',
    processing: 'processing',
    shipped: 'shipped',
    delivered: 'delivered',
    completed: 'completed',
    cancelled: 'rejected',
    refunded: 'refunded',
    disputed: 'on_hold',
  };
  return statusMap[legacy.toLowerCase()] ?? 'processing';
}

// ────────────────────────────────────────────────────────────
// Migration runner
// ────────────────────────────────────────────────────────────

async function migrateCategories(_rows: any[]) {
  console.log(`  ↳ Migrating ${_rows.length} categories...`);
  for (const row of _rows) {
    await prisma.category.upsert({
      where: { id: row.id?.toString() ?? row.uuid },
      update: {},
      create: {
        id: row.id?.toString() ?? row.uuid,
        name: { en: row.name_en ?? row.name, ar: row.name_ar ?? row.name },
        slug: row.slug ?? row.name_en?.toLowerCase().replace(/\s+/g, '-'),
        description: row.description
          ? { en: row.description_en ?? row.description, ar: row.description_ar ?? '' }
          : undefined,
        icon: row.icon ?? null,
        image: row.image ?? null,
        parentId: row.parent_id?.toString() ?? null,
        sortOrder: row.sort_order ?? 0,
        isActive: toBool(row.is_active ?? 1),
      },
    });
  }
}

async function migrateProfiles(_rows: any[]) {
  console.log(`  ↳ Migrating ${_rows.length} profiles...`);
  for (const row of _rows) {
    await prisma.profile.upsert({
      where: { id: row.uuid ?? row.id?.toString() },
      update: {},
      create: {
        id: row.uuid ?? row.id?.toString(),
        customId: row.custom_id ?? `C${row.id}`,
        email: row.email,
        phone: row.phone ?? null,
        firstName: row.first_name ?? '',
        lastName: row.last_name ?? '',
        image: row.avatar ?? null,
        role: (row.role ?? 'customer').toLowerCase() as any,
        status: mapUserStatus(row.status ?? 'active'),
        isVip: toBool(row.is_vip ?? 0),
        walletBalance: row.wallet_balance ?? 0,
        countryId: row.country_id?.toString() ?? null,
        stateId: row.state_id?.toString() ?? null,
        cityId: row.city_id?.toString() ?? null,
        createdAt: row.created_at ? new Date(row.created_at) : new Date(),
        updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
      },
    });
  }
}

async function migrateProducts(_rows: any[]) {
  console.log(`  ↳ Migrating ${_rows.length} products...`);
  for (const row of _rows) {
    await prisma.product.upsert({
      where: { id: row.uuid ?? row.id?.toString() },
      update: {},
      create: {
        id: row.uuid ?? row.id?.toString(),
        merchantId: row.seller_id?.toString() ?? row.user_id?.toString(),
        categoryId: row.category_id?.toString(),
        name: { en: row.title_en ?? row.title ?? '', ar: row.title_ar ?? row.title ?? '' },
        slug: row.slug ?? '',
        description: {
          en: row.description_en ?? row.description ?? '',
          ar: row.description_ar ?? row.description ?? '',
        },
        saleType: (row.type ?? 'auction').toLowerCase() === 'direct' ? 'direct' : 'auction',
        status: mapProductStatus(row.status ?? 'draft'),
        price: row.starting_price ?? row.start_price ?? 0,
        currentBid: row.current_price ?? row.start_price ?? 0,
        reservePrice: row.reserve_price ?? null,
        minBidPrice: row.starting_price ?? row.start_price ?? 0,
        bidIncrement1: row.bid_increment ?? 1,
        startDate: row.start_date ? new Date(row.start_date) : new Date(),
        endDate: row.end_date ? new Date(row.end_date) : new Date(),
        bidCount: row.total_bids ?? 0,
        viewCount: row.total_views ?? 0,
        createdAt: row.created_at ? new Date(row.created_at) : new Date(),
        updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
      },
    });
  }
}

async function migrateOrders(_rows: any[]) {
  console.log(`  ↳ Migrating ${_rows.length} orders...`);
  for (const row of _rows) {
    await prisma.order.upsert({
      where: { id: row.uuid ?? row.id?.toString() },
      update: {},
      create: {
        id: row.uuid ?? row.id?.toString(),
        orderNumber: row.order_number ?? `MZD${row.id}`,
        userId: row.buyer_id?.toString() ?? row.user_id?.toString(),
        merchantId: row.seller_id?.toString(),
        productId: row.product_id?.toString(),
        type: 'bid',
        amount: row.amount ?? row.total ?? 0,
        commissionAmount: row.commission_amount ?? 0,
        taxAmount: row.vat_amount ?? 0,
        totalAmount: row.total_amount ?? row.total ?? 0,
        status: mapOrderStatus(row.status ?? 'pending'),
        paymentMethod: row.payment_method ?? null,
        createdAt: row.created_at ? new Date(row.created_at) : new Date(),
        updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
      },
    });
  }
}

// ────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Mzadat MySQL → Supabase Migration      ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log();

  // TODO: Connect to legacy MySQL and read tables
  // For now this script provides the mapping structure.
  // Uncomment and fill mysql2 connection when ready.

  // import mysql from 'mysql2/promise';
  // const mysqlConn = await mysql.createConnection({
  //   host: process.env.MYSQL_HOST,
  //   port: Number(process.env.MYSQL_PORT ?? 3306),
  //   user: process.env.MYSQL_USER,
  //   password: process.env.MYSQL_PASSWORD,
  //   database: process.env.MYSQL_DATABASE,
  // });

  console.log('Migration order:');
  console.log('  1. Languages & Currencies (from seed)');
  console.log('  2. Countries → States → Cities');
  console.log('  3. Categories');
  console.log('  4. Profiles (Users)');
  console.log('  5. Stores');
  console.log('  6. Groups');
  console.log('  7. Products + Gallery + Specs');
  console.log('  8. Bid History');
  console.log('  9. Orders');
  console.log(' 10. Wallet Transactions');
  console.log(' 11. Bank Deposits & Withdrawals');
  console.log(' 12. Blogs & Comments');
  console.log(' 13. Support Tickets');
  console.log(' 14. Watchlists & Notifications');
  console.log(' 15. Menu & Widgets');
  console.log(' 16. Settings, Email Templates, etc.');
  console.log();

  console.log('⚠  This is a template script. Implement each section');
  console.log('   using the mapping functions above as reference.');
  console.log();
  console.log('   See mzadat-legacy/ for the source codebase structure');
  console.log('   and mzadat_mzadat.sql for the MySQL dump.');
  console.log();

  // Example usage (uncomment when ready):
  // const [categories] = await mysqlConn.execute('SELECT * FROM categories');
  // await migrateCategories(categories as any[]);
  //
  // const [users] = await mysqlConn.execute('SELECT * FROM users');
  // await migrateProfiles(users as any[]);
  //
  // const [products] = await mysqlConn.execute('SELECT * FROM products');
  // await migrateProducts(products as any[]);
  //
  // const [orders] = await mysqlConn.execute('SELECT * FROM orders');
  // await migrateOrders(orders as any[]);

  await prisma.$disconnect();
  console.log('✓ Migration template ready');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
