import { Users, Package, ShoppingCart, Gavel } from 'lucide-react'

const iconMap = {
  users: Users,
  products: Package,
  orders: ShoppingCart,
  auctions: Gavel,
}

interface Stat {
  label: string
  value: number
  icon: keyof typeof iconMap
}

export function StatsCards({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = iconMap[stat.icon]
        return (
          <div
            key={stat.label}
            className="rounded-lg border border-gray-200 bg-white px-4 py-3.5"
          >
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-medium text-gray-500">{stat.label}</p>
              <Icon className="h-4 w-4 text-brand-600/60" />
            </div>
            <p className="mt-1 text-[22px] font-semibold tracking-tight text-gray-900">{stat.value.toLocaleString()}</p>
          </div>
        )
      })}
    </div>
  )
}
