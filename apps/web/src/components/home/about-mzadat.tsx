'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'
import { Gavel, Users, TrendingUp, Shield, Gem, Scale } from 'lucide-react'

interface AboutMzadatProps {
  locale: string
  stats?: { totalAuctions: number; totalBids: number; totalUsers: number }
}

export function AboutMzadat({ locale, stats }: AboutMzadatProps) {
  const isAr = locale === 'ar'

  const statItems = [
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

  const values = [
    {
      icon: <Scale className="h-5 w-5" />,
      title: isAr ? 'الشفافية' : 'Transparency',
      description: isAr
        ? 'كل مزايدة واضحة وعادلة. نضمن لك تجربة مزايدة شفافة من البداية حتى النهاية'
        : 'Every bid is clear and fair. We ensure a transparent bidding experience from start to finish.',
    },
    {
      icon: <Shield className="h-5 w-5" />,
      title: isAr ? 'الأمان' : 'Security',
      description: isAr
        ? 'معاملات آمنة ومحمية. أموالك في أيدٍ أمينة مع أنظمة الحماية المتقدمة'
        : 'Safe and protected transactions. Your funds are in trusted hands with advanced security systems.',
    },
    {
      icon: <Gem className="h-5 w-5" />,
      title: isAr ? 'الثقة' : 'Trust',
      description: isAr
        ? 'منصة موثوقة تخدم تجار ومشترين من جميع أنحاء سلطنة عُمان'
        : 'A trusted platform serving merchants and buyers across the Sultanate of Oman.',
    },
  ]

  return (
    <section className="relative overflow-hidden bg-primary-900 py-20 lg:py-28">
      {/* Subtle dot pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <span className="inline-block text-[11px] uppercase tracking-[0.3em] text-primary-300/70">
            Mzadat • مزادات
          </span>

          {/* Elegant divider */}
          <div className="my-5 flex items-center justify-center gap-3">
            <div className="h-px w-10 bg-primary-400/20" />
            <div className="h-1.5 w-1.5 rotate-45 border border-primary-400/30" />
            <div className="h-px w-10 bg-primary-400/20" />
          </div>

          <h2 className="text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
            {isAr
              ? 'منصة مزادات الأولى في عُمان'
              : "Oman's Premier Auction Platform"}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-white/45">
            {isAr
              ? 'منصة مزادات تقدم تجربة مزايدة شفافة وآمنة لمجموعة متنوعة من الأصول والمنتجات في سلطنة عُمان'
              : 'A trusted platform delivering transparent and secure bidding experiences across a diverse range of assets and products in the Sultanate of Oman.'}
          </p>
        </motion.div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-2 gap-6 lg:grid-cols-4">
          {statItems.map((item, index) => (
            <StatCounter key={index} item={item} index={index} />
          ))}
        </div>

        {/* Values */}
        <div className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-3">
          {values.map((value, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="rounded-2xl border border-white/6 bg-white/3 p-6 backdrop-blur-sm"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-primary-300">
                {value.icon}
              </div>
              <h3 className="font-semibold text-white">{value.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-white/40">
                {value.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Animated Stat Counter ────────────────────────────────────

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
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white/80">
        {item.icon}
      </div>
      <div className="text-3xl font-bold tabular-nums text-white sm:text-4xl">
        {count.toLocaleString()}
        {item.suffix}
      </div>
      <div className="mt-1 text-xs text-white/40">{item.label}</div>
    </motion.div>
  )
}
