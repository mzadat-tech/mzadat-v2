/**
 * Seed an admin user in Supabase Auth + Prisma Profile.
 *
 * Usage:
 *   npx tsx scripts/seed-admin.ts
 *
 *   Env overrides (optional):
 *     ADMIN_EMAIL=admin@mzadat.com ADMIN_PASSWORD=Admin@123 npx tsx scripts/seed-admin.ts
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // service role can auto-confirm
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@mzadat.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123'

async function main() {
  console.log(`\n🔐 Seeding admin user: ${ADMIN_EMAIL}\n`)

  // 1. Check if auth user already exists
  const { data: existing } = await supabase.auth.admin.listUsers()
  const existingUser = existing?.users?.find((u) => u.email === ADMIN_EMAIL)

  let userId: string

  if (existingUser) {
    userId = existingUser.id
    console.log(`   Auth user already exists (${userId})`)

    // Update to confirm email + set password
    await supabase.auth.admin.updateUserById(userId, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
    })
    console.log('   ✓ Updated password & confirmed email')
  } else {
    // 2. Create auth user with auto-confirm
    const { data, error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true, // <-- this is the key flag
    })

    if (error) {
      console.error('   ✗ Failed to create auth user:', error.message)
      process.exit(1)
    }

    userId = data.user.id
    console.log(`   ✓ Created auth user (${userId})`)
  }

  // 3. Upsert Profile row
  const profile = await prisma.profile.upsert({
    where: { id: userId },
    update: {
      role: 'super_admin',
      status: 'active',
    },
    create: {
      id: userId,
      customId: 'A0001',
      email: ADMIN_EMAIL,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'super_admin',
      status: 'active',
      registerAs: 'individual',
    },
  })

  console.log(`   ✓ Profile upserted (role: ${profile.role}, status: ${profile.status})`)
  console.log(`\n✅ Done! Sign in at http://localhost:8002/login`)
  console.log(`   Email:    ${ADMIN_EMAIL}`)
  console.log(`   Password: ${ADMIN_PASSWORD}\n`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
