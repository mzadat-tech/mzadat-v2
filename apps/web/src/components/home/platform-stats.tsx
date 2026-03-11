'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'
import { Gavel, Users, TrendingUp, Shield } from 'lucide-react'

interface PlatformStatsProps {
  locale: string
  stats?: { totalAuctions: number; totalBids: number; totalUsers: number }
}

export function PlatformStats({ locale, stats }: PlatformStatsProps) {
  const isAr = locale === 'ar'

  const items = [
    {
      icon: <Gavel className="h-5 w-5" />,
      value: stats?.totalAuctions || 500,
      suffix: '+',
      label: isAr ? 'مزاد مكتمل' : 'Auctions Completed',
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      value: stats?.totalBids || 25000,
      suffix: '+',
      label: isAr ? 'مزايدة ناجحة' : 'Successful Bids',
    },
    {
      icon: <Users className="h-5 w-5" />,
      value: stats?.totalUsers || 10000,
      suffix: '+',
      label: isAr ? 'مستخدم مسجل' : 'Registered Users',
    },
    {
      icon: <Shield className="h-5 w-5" />,
      value: 100,
      suffix: '%',
      label: isAr ? 'ضمان الشفافية' : 'Transparency',
    },
  ]

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 py-16 lg:py-20">
      {/* Subtle pattern */}
      <div className="absolute inset-0 opacity-[0.04]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* About text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <h2 className="text-xl font-bold text-white sm:text-2xl">
            {isAr ? 'منصة مزادات الأولى في عُمان' : "Oman's Premier Auction Platform"}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/60">
            {isAr
              ? 'منصة مزادات تقدم تجربة مزايدة شفافة وآمنة لمجموعة متنوعة من الأصول والمنتجات'
              : 'A trusted platform delivering transparent and secure bidding experiences across a diverse range of assets and products'}
          </p>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {items.map((item, index) => (
            <StatCounter key={index} item={item} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}

function StatCounter({
  item,
  index,
}: {
  item: {
    icon: React.ReactNode
    value: number
    suffix: string
    label: string
  }
  index: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!isInView) return

    const duration = 2000
    const start = Date.now()
    const target = item.value

    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  }, [isInView, item.value])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="text-center"
    >
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white">
        {item.icon}
      </div>
      <div className="text-3xl font-bold tabular-nums text-white sm:text-4xl">
        {count.toLocaleString()}{item.suffix}
      </div>
      <div className="mt-1 text-sm text-white/50">{item.label}</div>
    </motion.div>
  )
}
