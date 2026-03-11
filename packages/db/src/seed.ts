import { prisma } from './client'

async function seed() {
  console.log('🌱 Seeding database...')

  // Seed languages
  await prisma.language.upsert({
    where: { code: 'en' },
    update: {},
    create: { name: 'English', code: 'en', direction: 'ltr', isDefault: true },
  })
  await prisma.language.upsert({
    where: { code: 'ar' },
    update: {},
    create: { name: 'العربية', code: 'ar', direction: 'rtl', isDefault: false },
  })

  // Seed default currency
  await prisma.currency.upsert({
    where: { code: 'OMR' },
    update: {},
    create: {
      name: 'Omani Rial',
      symbol: 'OMR',
      code: 'OMR',
      exchangeRate: 1.0,
      isDefault: true,
    },
  })

  // Seed Oman country
  const oman = await prisma.country.upsert({
    where: { code: 'OM' },
    update: {},
    create: {
      name: { en: 'Oman', ar: 'عمان' },
      code: 'OM',
      phoneCode: '+968',
    },
  })

  console.log('✅ Seed completed')
  console.log({ oman })
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
