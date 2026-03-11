/**
 * Seed development data
 *
 * Creates realistic test data for local development.
 * Runs AFTER the base seed (packages/db/src/seed.ts).
 *
 * Usage:
 *   pnpm tsx scripts/seed-dev-data.ts
 *
 * Prerequisites:
 *   - Database migrated (pnpm db:migrate:dev)
 *   - Base seed run (pnpm db:seed)
 */

import { PrismaClient, Decimal } from '@mzadat/db';

const prisma = new PrismaClient();

// ────────────────────────────────────────────────────────────
// Seeding helpers
// ────────────────────────────────────────────────────────────

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function futureDate(daysFromNow: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d;
}

function pastDate(daysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d;
}

// ────────────────────────────────────────────────────────────
// Seed data
// ────────────────────────────────────────────────────────────

const DEV_CATEGORIES = [
  { name: { en: 'Electronics', ar: 'إلكترونيات' }, slug: 'electronics', icon: 'monitor' },
  { name: { en: 'Vehicles', ar: 'مركبات' }, slug: 'vehicles', icon: 'car' },
  { name: { en: 'Real Estate', ar: 'عقارات' }, slug: 'real-estate', icon: 'home' },
  { name: { en: 'Fashion', ar: 'أزياء' }, slug: 'fashion', icon: 'shirt' },
  { name: { en: 'Furniture', ar: 'أثاث' }, slug: 'furniture', icon: 'sofa' },
  { name: { en: 'Sports', ar: 'رياضة' }, slug: 'sports', icon: 'dumbbell' },
  { name: { en: 'Collectibles', ar: 'مقتنيات' }, slug: 'collectibles', icon: 'gem' },
  { name: { en: 'Art', ar: 'فنون' }, slug: 'art', icon: 'palette' },
];

const DEV_GROUPS = [
  {
    name: { en: 'Weekend Special', ar: 'عروض نهاية الأسبوع' },
    slug: 'weekend-special',
    description: {
      en: 'Special auctions every weekend',
      ar: 'مزادات خاصة كل نهاية أسبوع',
    },
  },
  {
    name: { en: 'Premium Collection', ar: 'المجموعة المميزة' },
    slug: 'premium-collection',
    description: {
      en: 'Premium and high-value items',
      ar: 'عناصر مميزة وعالية القيمة',
    },
  },
  {
    name: { en: 'Flash Deals', ar: 'صفقات سريعة' },
    slug: 'flash-deals',
    description: {
      en: 'Short-duration auctions with great deals',
      ar: 'مزادات قصيرة بصفقات رائعة',
    },
  },
];

const SAMPLE_PRODUCTS = [
  {
    title: { en: 'iPhone 15 Pro Max 256GB', ar: 'آيفون 15 برو ماكس 256 جيجا' },
    slug: 'iphone-15-pro-max-256gb',
    description: {
      en: 'Brand new iPhone 15 Pro Max, sealed box, Oman warranty',
      ar: 'آيفون 15 برو ماكس جديد بالكرتون، ضمان عمان',
    },
    startingPrice: 150,
    bidIncrement: 5,
    categorySlug: 'electronics',
  },
  {
    title: { en: 'Toyota Land Cruiser 2020', ar: 'تويوتا لاند كروزر 2020' },
    slug: 'toyota-land-cruiser-2020',
    description: {
      en: 'Well maintained, 60,000 km, full service history',
      ar: 'صيانة ممتازة، 60,000 كم، سجل صيانة كامل',
    },
    startingPrice: 8000,
    bidIncrement: 100,
    categorySlug: 'vehicles',
  },
  {
    title: { en: 'Antique Omani Khanjar', ar: 'خنجر عماني أثري' },
    slug: 'antique-omani-khanjar',
    description: {
      en: 'Authentic antique Omani khanjar, silver handle, 50+ years old',
      ar: 'خنجر عماني أصلي قديم، مقبض فضة، أكثر من 50 سنة',
    },
    startingPrice: 500,
    bidIncrement: 25,
    categorySlug: 'collectibles',
  },
  {
    title: { en: 'Samsung 75" QLED Smart TV', ar: 'تلفزيون سامسونج 75 بوصة ذكي' },
    slug: 'samsung-75-qled-smart-tv',
    description: {
      en: '75 inch QLED 4K Smart TV, 2024 model',
      ar: 'تلفزيون ذكي 75 بوصة QLED 4K موديل 2024',
    },
    startingPrice: 200,
    bidIncrement: 10,
    categorySlug: 'electronics',
  },
  {
    title: { en: 'Italian Leather Sofa Set', ar: 'طقم كنب جلد إيطالي' },
    slug: 'italian-leather-sofa-set',
    description: {
      en: 'Premium Italian leather sofa set, 3+2+1 seater',
      ar: 'طقم كنب جلد إيطالي فاخر، 3+2+1 مقعد',
    },
    startingPrice: 300,
    bidIncrement: 15,
    categorySlug: 'furniture',
  },
];

// ────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Seed Development Data                  ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log();

  // 1. Categories
  console.log('→ Seeding categories...');
  const categoryMap: Record<string, string> = {};
  for (const cat of DEV_CATEGORIES) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: {
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        status: 'active',
        sortOrder: DEV_CATEGORIES.indexOf(cat),
      },
    });
    categoryMap[cat.slug] = created.id;
  }
  console.log(`  ✓ ${DEV_CATEGORIES.length} categories seeded`);

  // 2. Test admin profile
  console.log('→ Seeding test admin profile...');
  const admin = await prisma.profile.upsert({
    where: { email: 'admin@mzadat.om' },
    update: {},
    create: {
      id: crypto.randomUUID(),
      customId: 'C1',
      email: 'admin@mzadat.om',
      phone: '+96899000001',
      firstName: 'Admin',
      lastName: 'Mzadat',
      role: 'super_admin',
      status: 'active',
      walletBalance: new Decimal('1000.000'),
    },
  });
  console.log(`  ✓ Admin profile: ${admin.email}`);

  // 3. Test merchant profile
  const merchant = await prisma.profile.upsert({
    where: { email: 'merchant@mzadat.om' },
    update: {},
    create: {
      id: crypto.randomUUID(),
      customId: 'MC1',
      email: 'merchant@mzadat.om',
      phone: '+96899000002',
      firstName: 'Test',
      lastName: 'Merchant',
      role: 'merchant',
      status: 'active',
      walletBalance: new Decimal('5000.000'),
    },
  });
  console.log(`  ✓ Merchant profile: ${merchant.email}`);

  // 4. Groups (needs merchantId from admin profile)
  console.log('→ Seeding groups...');
  const groupIds: string[] = [];
  for (const grp of DEV_GROUPS) {
    const created = await prisma.group.create({
      data: {
        merchantId: admin.id,
        name: grp.name,
        description: grp.description,
        startDate: pastDate(1),
        endDate: futureDate(30),
        status: 'active',
      },
    });
    groupIds.push(created.id);
  }
  console.log(`  ✓ ${DEV_GROUPS.length} groups seeded`);

  // 5. Test user profiles
  console.log('→ Seeding test user profiles...');
  const userIds: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const user = await prisma.profile.upsert({
      where: { email: `user${i}@mzadat.om` },
      update: {},
      create: {
        id: crypto.randomUUID(),
        customId: `C${100 + i}`,
        email: `user${i}@mzadat.om`,
        phone: `+9689900010${i}`,
        firstName: `User`,
        lastName: `${i}`,
        role: 'customer',
        status: 'active',
        walletBalance: new Decimal(`${randomBetween(100, 2000)}.000`),
      },
    });
    userIds.push(user.id);
  }
  console.log(`  ✓ 5 test users seeded`);

  // 6. Merchant store
  console.log('→ Seeding merchant store...');
  const store = await prisma.store.upsert({
    where: { slug: 'test-store' },
    update: {},
    create: {
      ownerId: merchant.id,
      name: { en: 'Test Electronics Store', ar: 'متجر الإلكترونيات التجريبي' },
      slug: 'test-store',
      description: {
        en: 'A test merchant store for development',
        ar: 'متجر تجريبي للتطوير',
      },
      status: 'active',
    },
  });
  console.log(`  ✓ Store: ${store.slug}`);

  // 7. Products
  console.log('→ Seeding products...');
  for (const prod of SAMPLE_PRODUCTS) {
    const categoryId = categoryMap[prod.categorySlug];
    if (!categoryId) continue;

    await prisma.product.upsert({
      where: { slug: prod.slug },
      update: {},
      create: {
        merchantId: merchant.id,
        storeId: store.id,
        categoryId,
        groupId: groupIds[randomBetween(0, groupIds.length - 1)] ?? null,
        name: prod.title,
        slug: prod.slug,
        description: prod.description,
        saleType: 'auction',
        status: 'published',
        price: new Decimal(`${prod.startingPrice}.000`),
        currentBid: new Decimal(`${prod.startingPrice}.000`),
        minBidPrice: new Decimal(`${prod.startingPrice}.000`),
        bidIncrement1: new Decimal(`${prod.bidIncrement}.000`),
        startDate: pastDate(1),
        endDate: futureDate(randomBetween(3, 14)),
        bidCount: 0,
        viewCount: randomBetween(10, 500),
      },
    });
  }
  console.log(`  ✓ ${SAMPLE_PRODUCTS.length} products seeded`);

  // 8. Settings are now managed by Payload CMS (SiteSettings global)
  // Skipping prisma.setting — see apps/admin/src/globals/SiteSettings.ts

  // 9. Payment methods
  console.log('→ Seeding payment methods...');
  const paymentMethods = [
    { name: { en: 'Thawani Pay', ar: 'ثواني' }, code: 'thawani', isActive: true },
    { name: { en: 'Bank Transfer', ar: 'حوالة بنكية' }, code: 'bank_transfer', isActive: true },
    {
      name: { en: 'Wallet Balance', ar: 'رصيد المحفظة' },
      code: 'wallet',
      isActive: true,
    },
  ];

  for (const pm of paymentMethods) {
    await prisma.paymentMethod.upsert({
      where: { slug: pm.code },
      update: {},
      create: {
        methodName: pm.name.en,
        slug: pm.code,
        status: pm.isActive ? 'active' : 'inactive',
        sortOrder: paymentMethods.indexOf(pm),
      },
    });
  }
  console.log(`  ✓ ${paymentMethods.length} payment methods seeded`);

  await prisma.$disconnect();
  console.log('\n✓ Development data seeded successfully!');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
