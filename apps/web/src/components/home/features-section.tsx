'use client'

import { motion } from 'framer-motion'
import { Camera, Scale, TrendingUp, ShieldCheck, Lightbulb, Headphones } from 'lucide-react'

interface FeaturesSectionProps {
  locale: string
}

export function FeaturesSection({ locale }: FeaturesSectionProps) {
  const isAr = locale === 'ar'

  const features = [
    {
      icon: <Scale className="h-6 w-6" />,
      title: isAr ? 'شفافية كاملة' : 'Full Transparency',
      description: isAr
        ? 'نظام مزايدة شفاف يضمن النزاهة والعدالة في كل مزاد'
        : 'Transparent bidding system ensuring fairness in every auction',
      color: 'bg-blue-100 text-blue-700',
    },
    {
      icon: <ShieldCheck className="h-6 w-6" />,
      title: isAr ? 'حماية قانونية' : 'Legal Protection',
      description: isAr
        ? 'عقود وضمانات قانونية لحماية حقوق المشترين والبائعين'
        : 'Legal contracts and guarantees protecting buyers and sellers',
      color: 'bg-emerald-100 text-emerald-700',
    },
    {
      icon: <Camera className="h-6 w-6" />,
      title: isAr ? 'تصوير احترافي' : 'Professional Photography',
      description: isAr
        ? 'صور ومقاطع عالية الجودة لكل منتج مع تقارير فحص مفصلة'
        : 'High-quality photos and videos of every item with detailed inspection reports',
      color: 'bg-purple-100 text-purple-700',
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: isAr ? 'تسويق فعّال' : 'Effective Marketing',
      description: isAr
        ? 'حملات تسويقية متكاملة تضمن أعلى قيمة لأصولك'
        : 'Comprehensive marketing campaigns ensuring maximum value for your assets',
      color: 'bg-amber-100 text-amber-700',
    },
    {
      icon: <Lightbulb className="h-6 w-6" />,
      title: isAr ? 'خبرة طويلة' : 'Years of Expertise',
      description: isAr
        ? 'فريق من الخبراء المتخصصين في إدارة المزادات والتقييم'
        : 'Team of specialists in auction management and asset valuation',
      color: 'bg-rose-100 text-rose-700',
    },
    {
      icon: <Headphones className="h-6 w-6" />,
      title: isAr ? 'دعم متواصل' : '24/7 Support',
      description: isAr
        ? 'فريق دعم متوفر على مدار الساعة لمساعدتك في كل خطوة'
        : 'Support team available around the clock to assist you at every step',
      color: 'bg-cyan-100 text-cyan-700',
    },
  ]

  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            {isAr ? 'لماذا تختار مزادات؟' : 'Why Choose Mzadat?'}
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            {isAr
              ? 'نقدم خدمات مزادات متكاملة بأعلى معايير الجودة والاحترافية'
              : 'We provide comprehensive auction services with the highest standards of quality and professionalism'}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              whileHover={{ y: -4 }}
              className="rounded-2xl border border-border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div
                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${feature.color}`}
              >
                {feature.icon}
              </div>
              <h3 className="mb-2 text-base font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
