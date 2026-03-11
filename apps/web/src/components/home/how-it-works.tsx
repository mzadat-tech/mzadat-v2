'use client'

import { motion } from 'framer-motion'
import { UserPlus, Search, Gavel, Trophy } from 'lucide-react'

interface HowItWorksProps {
  locale: string
}

export function HowItWorks({ locale }: HowItWorksProps) {
  const isAr = locale === 'ar'

  const steps = [
    {
      icon: <UserPlus className="h-6 w-6" />,
      step: '01',
      title: isAr ? 'أنشئ حسابك' : 'Create Your Account',
      description: isAr
        ? 'سجل مجاناً في دقائق وأكمل ملفك الشخصي للبدء في المزايدة على منصة مزادات'
        : 'Sign up for free in minutes and complete your profile to start bidding on the Mzadat platform.',
    },
    {
      icon: <Search className="h-6 w-6" />,
      step: '02',
      title: isAr ? 'تصفح المزادات' : 'Browse Auctions',
      description: isAr
        ? 'استعرض مجموعة متنوعة من المزادات في فئات مختلفة — سيارات، إلكترونيات، عقارات والمزيد'
        : 'Explore a diverse range of auctions across categories — vehicles, electronics, real estate, and more.',
    },
    {
      icon: <Gavel className="h-6 w-6" />,
      step: '03',
      title: isAr ? 'قدّم مزايدتك' : 'Place Your Bid',
      description: isAr
        ? 'قدّم عروضك بثقة مع نظام مزايدة شفاف في الوقت الفعلي وتنبيهات فورية'
        : 'Bid with confidence using our real-time transparent bidding system with instant notifications.',
    },
    {
      icon: <Trophy className="h-6 w-6" />,
      step: '04',
      title: isAr ? 'اربح واستلم' : 'Win & Collect',
      description: isAr
        ? 'اربح المزاد وأكمل عملية الدفع الآمنة. استلم منتجك بسرعة وسهولة'
        : 'Win the auction and complete secure payment. Collect your item quickly and easily.',
    },
  ]

  return (
    <section className="bg-gray-50 py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <span className="inline-block rounded-full bg-primary-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary-700">
            {isAr ? 'كيف تعمل المنصة' : 'How It Works'}
          </span>
          <h2 className="mt-4 text-2xl font-bold text-gray-900 sm:text-3xl lg:text-4xl">
            {isAr
              ? 'ابدأ المزايدة في ٤ خطوات بسيطة'
              : 'Start Bidding in 4 Simple Steps'}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-gray-500">
            {isAr
              ? 'منصة مزادات تجعل عملية المزايدة سهلة وممتعة. اتبع هذه الخطوات البسيطة للبدء'
              : 'Mzadat makes the auction process easy and enjoyable. Follow these simple steps to get started with online bidding in Oman.'}
          </p>
        </motion.div>

        {/* Steps */}
        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="group relative text-center"
            >
              {/* Connector line (hidden on mobile and last item) */}
              {index < steps.length - 1 && (
                <div className="absolute top-10 hidden h-px w-full bg-linear-to-r from-primary-200 to-primary-100 lg:block ltr:left-1/2 rtl:right-1/2" />
              )}

              {/* Icon */}
              <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-white text-primary-600 shadow-md ring-1 ring-gray-100 transition-all group-hover:shadow-lg group-hover:ring-primary-200">
                {step.icon}
                <span className="absolute -inset-e-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white">
                  {step.step}
                </span>
              </div>

              <h3 className="text-base font-semibold text-gray-900">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
