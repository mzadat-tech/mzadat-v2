import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const isDev = process.env.NODE_ENV === 'development'

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isDev
      ? [
          { level: 'query', emit: 'event' },
          { level: 'error', emit: 'stdout' },
          { level: 'warn', emit: 'stdout' },
        ]
      : ['error'],
  })

if (isDev) {
  // Log each SQL query with its duration
  ;(prisma as any).$on('query', (e: { query: string; duration: number; params: string }) => {
    const q = e.query.length > 120 ? e.query.slice(0, 120) + '…' : e.query
    console.log(`⏱️  prisma query (${e.duration}ms): ${q}`)
  })
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
