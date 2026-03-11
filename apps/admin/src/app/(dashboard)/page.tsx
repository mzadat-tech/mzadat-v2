import { prisma } from '@mzadat/db'
import { CURRENCY_CODE } from '@mzadat/config'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { RecentOrders } from '@/components/dashboard/recent-orders'
import { TopProducts } from '@/components/dashboard/top-products'
import { requireAdmin } from '@/lib/auth'

export default async function DashboardPage() {
  const admin = await requireAdmin()

  // Fetch stats in parallel
  const [userCount, productCount, orderCount, activeAuctions, recentOrders, revenueData] =
    await Promise.all([
      prisma.profile.count(),
      prisma.product.count(),
      prisma.order.count(),
      prisma.product.count({
        where: { status: 'published', saleType: 'auction' },
      }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { firstName: true, lastName: true } },
          product: { select: { name: true } },
        },
      }),
      getRevenueData(),
    ])

  const stats = [
    { label: 'Total Users', value: userCount, icon: 'users' as const },
    { label: 'Lots', value: productCount, icon: 'products' as const },
    { label: 'Orders', value: orderCount, icon: 'orders' as const },
    { label: 'Active Auctions', value: activeAuctions, icon: 'auctions' as const },
  ]

  return (
    <div className="space-y-4">
      {/* Page Title */}
      <div>
        <h1 className="text-[15px] font-semibold tracking-tight text-gray-900">Dashboard</h1>
        <p className="text-[13px] text-gray-400">Welcome back, {admin.fullName}</p>
      </div>

      {/* Stats */}
      <StatsCards stats={stats} />

      {/* Charts + Tables Row */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <RevenueChart data={revenueData} currency={CURRENCY_CODE} />
        </div>
        <div className="lg:col-span-2">
          <TopProducts />
        </div>
      </div>

      {/* Recent Orders */}
      <RecentOrders orders={recentOrders} currency={CURRENCY_CODE} />
    </div>
  )
}

async function getRevenueData() {
  // Get last 7 days of order totals in a single query
  const days = 7
  const rangeStart = new Date()
  rangeStart.setDate(rangeStart.getDate() - (days - 1))
  rangeStart.setHours(0, 0, 0, 0)

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: rangeStart } },
    select: { totalAmount: true, createdAt: true },
  })

  const data: { date: string; revenue: number; orders: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)

    const dayOrders = orders.filter(
      (o) => o.createdAt >= dayStart && o.createdAt < dayEnd
    )

    data.push({
      date: dayStart.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }),
      revenue: dayOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0),
      orders: dayOrders.length,
    })
  }

  return data
}
