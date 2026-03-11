'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'
import { Gavel, Users, TrendingUp, Shield } from 'lucide-react'

interface StatsSectionProps {
  locale: string
  stats?: { totalAuctions: number; totalBids: number; totalUsers: number }
}

export function StatsSection({ locale, stats }: StatsSectionProps) {
  const isAr = locale === 'ar'

  const items = [
    {
      icon: <Gavel className="h-6 w-6" />,
      value: stats?.totalAuctions || 500,
      suffix: '+',
      label: isAr ? 'مزاد مكتمل' : 'Auctions Completed',
      color: 'bg-primary-100 text-primary-700',
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      value: stats?.totalBids || 25000,
      suffix: '+',
      label: isAr ? 'مزايدة ناجحة' : 'Successful Bids',
      color: 'bg-emerald-100 text-emerald-700',
    },
    {
      icon: <Users className="h-6 w-6" />,
      value: stats?.totalUsers || 10000,
      suffix: '+',
      label: isAr ? 'مستخدم مسجل' : 'Registered Users',
      color: 'bg-amber-100 text-amber-700',
    },
    {
      icon: <Shield className="h-6 w-6" />,
      value: 100,
      suffix: '%',
      label: isAr ? 'ضمان الشفافية' : 'Transparency Guaranteed',
      color: 'bg-accent-100 text-accent-700',
    },
  ]

  return (
    <section className="border-y border-border bg-muted/30 py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10 text-center"
        >
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            {isAr ? 'أرقام تتحدث عنا' : 'Our Numbers Speak'}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {isAr ? 'ثقة ونمو مستمر في منصة مزادات' : 'Continuous trust and growth on Mzadat'}
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {items.map((item, index) => (
            <StatCard key={index} item={item} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}

function StatCard({
  item,
  index,
}: {
  item: {
    icon: React.ReactNode
    value: number
    suffix: string
    label: string
    color: string
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

    const animate = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setCount(Math.round(eased * target))

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [isInView, item.value])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="rounded-2xl border border-border bg-white p-6 text-center shadow-sm"
    >
      <div
        className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${item.color}`}
      >
        {item.icon}
      </div>
      <div className="text-3xl font-extrabold text-foreground tabular-nums sm:text-4xl">
        {count.toLocaleString()}
        {item.suffix}
      </div>
      <div className="mt-1 text-sm text-muted-foreground">{item.label}</div>
    </motion.div>
  )
}
