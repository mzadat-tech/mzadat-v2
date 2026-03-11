/**
 * Generate TypeScript types from Prisma schema
 *
 * This script runs Prisma generate and then creates additional
 * utility types used throughout the monorepo.
 *
 * Usage:
 *   pnpm tsx scripts/generate-types.ts
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '..');

function run(cmd: string) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
}

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Generate Types                         ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log();

  // 1. Generate Prisma client
  console.log('→ Generating Prisma client...');
  run('pnpm --filter @mzadat/db exec prisma generate');
  console.log('✓ Prisma client generated\n');

  // 2. Generate API types barrel file
  const apiTypesPath = resolve(ROOT, 'packages/db/src/api-types.ts');

  const apiTypes = `/**
 * Auto-generated API response types
 * Generated at: ${new Date().toISOString()}
 *
 * These types extend Prisma models with common API patterns.
 */

import type { Prisma } from '@prisma/client';

// ── Product with relations ──────────────────────────────
export type ProductWithDetails = Prisma.ProductGetPayload<{
  include: {
    seller: { select: { id: true; firstName: true; lastName: true; avatar: true } };
    category: true;
    gallery: true;
    specifications: true;
    group: { select: { id: true; name: true } };
    store: { select: { id: true; name: true; logo: true } };
  };
}>;

export type ProductListItem = Prisma.ProductGetPayload<{
  include: {
    seller: { select: { id: true; firstName: true; lastName: true; avatar: true } };
    category: { select: { id: true; name: true; slug: true } };
    gallery: { select: { id: true; imageUrl: true; sortOrder: true }; take: 1 };
  };
}>;

// ── Order with relations ────────────────────────────────
export type OrderWithDetails = Prisma.OrderGetPayload<{
  include: {
    buyer: { select: { id: true; firstName: true; lastName: true; email: true } };
    seller: { select: { id: true; firstName: true; lastName: true; email: true } };
    product: {
      select: { id: true; title: true; customId: true };
    };
  };
}>;

// ── Profile with counts ─────────────────────────────────
export type ProfileWithStats = Prisma.ProfileGetPayload<{
  include: {
    _count: {
      select: {
        products: true;
        orders: true;
        purchases: true;
        watchlist: true;
      };
    };
  };
}>;

// ── Bid with product info ───────────────────────────────
export type BidWithProduct = Prisma.BidHistoryGetPayload<{
  include: {
    product: { select: { id: true; title: true; customId: true; endDate: true } };
    bidder: { select: { id: true; firstName: true; lastName: true } };
  };
}>;

// ── Support ticket with replies ─────────────────────────
export type TicketWithReplies = Prisma.SupportTicketGetPayload<{
  include: {
    user: { select: { id: true; firstName: true; lastName: true; email: true } };
    replies: {
      include: {
        user: { select: { id: true; firstName: true; lastName: true } };
        attachments: true;
      };
    };
  };
}>;

// ── Store with products count ───────────────────────────
export type StoreWithStats = Prisma.StoreGetPayload<{
  include: {
    owner: { select: { id: true; firstName: true; lastName: true } };
    _count: { select: { products: true } };
  };
}>;

// ── Wallet transaction ──────────────────────────────────
export type WalletTransactionWithUser = Prisma.WalletTransactionGetPayload<{
  include: {
    user: { select: { id: true; firstName: true; lastName: true; email: true } };
  };
}>;
`;

  writeFileSync(apiTypesPath, apiTypes);
  console.log('✓ API types generated at packages/db/src/api-types.ts\n');

  console.log('Done! All types are up to date.');
}

main().catch((err) => {
  console.error('Type generation failed:', err);
  process.exit(1);
});
