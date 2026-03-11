'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

interface FAQSectionProps {
  locale: string
}

export function FAQSection({ locale }: FAQSectionProps) {
  const isAr = locale === 'ar'

  const faqs = [
    {
      question: isAr ? 'ما هي منصة مزادات؟' : 'What is Mzadat?',
      answer: isAr
        ? 'مزادات هي أول منصة إلكترونية للمزادات في سلطنة عُمان. نوفر بيئة آمنة وشفافة للمزايدة على مجموعة متنوعة من المنتجات والأصول، بما في ذلك السيارات والعقارات والإلكترونيات والمزيد.'
        : 'Mzadat is the leading online auction platform in the Sultanate of Oman. We provide a secure and transparent environment for bidding on a diverse range of products and assets, including vehicles, real estate, electronics, and more.',
    },
    {
      question: isAr
        ? 'كيف أسجل في منصة مزادات؟'
        : 'How do I register on Mzadat?',
      answer: isAr
        ? 'التسجيل مجاني وسهل. اضغط على زر "تسجيل" في أعلى الصفحة، وأدخل بياناتك الشخصية ورقم هاتفك. ستتلقى رمز تحقق لتأكيد حسابك والبدء في المزايدة فوراً.'
        : 'Registration is free and easy. Click the "Register" button at the top of the page, enter your personal details and phone number. You\'ll receive a verification code to confirm your account and start bidding immediately.',
    },
    {
      question: isAr
        ? 'هل المزايدة على المنصة آمنة؟'
        : 'Is bidding on the platform safe?',
      answer: isAr
        ? 'نعم، نحن نستخدم أحدث تقنيات الأمان لحماية بياناتك الشخصية ومعاملاتك المالية. جميع المزادات تخضع لرقابة صارمة لضمان الشفافية والعدالة لجميع المشاركين.'
        : 'Yes, we use the latest security technologies to protect your personal data and financial transactions. All auctions are strictly monitored to ensure transparency and fairness for all participants.',
    },
    {
      question: isAr
        ? 'كيف أتابع المزادات المباشرة؟'
        : 'How do I follow live auctions?',
      answer: isAr
        ? 'يمكنك تصفح المزادات المباشرة من قسم "المزادات المباشرة" على الصفحة الرئيسية. فعّل الإشعارات لتلقي تنبيهات فورية عند بدء مزاد جديد أو عند اقتراب انتهاء مزاد تتابعه.'
        : 'You can browse live auctions from the "Live Auctions" section on the homepage. Enable notifications to receive instant alerts when a new auction starts or when an auction you\'re following is about to end.',
    },
    {
      question: isAr
        ? 'ما هي طرق الدفع المتاحة؟'
        : 'What payment methods are available?',
      answer: isAr
        ? 'نوفر عدة طرق دفع آمنة تشمل التحويل البنكي والبطاقات الائتمانية وبطاقات الخصم. جميع المعاملات تتم عبر بوابات دفع مشفرة وآمنة.'
        : 'We offer several secure payment methods including bank transfers, credit cards, and debit cards. All transactions are processed through encrypted and secure payment gateways.',
    },
    {
      question: isAr
        ? 'هل يمكنني بيع منتجاتي على المنصة؟'
        : 'Can I sell my products on the platform?',
      answer: isAr
        ? 'نعم! يمكنك التقدم كتاجر أو بائع على المنصة. تواصل معنا لمعرفة المزيد عن شروط البيع وعمولات المنصة والبدء في عرض منتجاتك للمزايدة.'
        : 'Yes! You can apply as a merchant or seller on the platform. Contact us to learn more about selling terms, platform commissions, and start listing your products for auction.',
    },
    {
      question: isAr
        ? 'ماذا يحدث إذا ربحت المزاد؟'
        : 'What happens if I win an auction?',
      answer: isAr
        ? 'عند الفوز بالمزاد، ستتلقى إشعاراً فورياً وتعليمات الدفع. يجب إتمام عملية الدفع خلال المدة المحددة. بعد تأكيد الدفع، يمكنك ترتيب استلام المنتج حسب الطريقة المتاحة.'
        : 'When you win an auction, you\'ll receive an instant notification and payment instructions. Payment must be completed within the specified timeframe. After payment confirmation, you can arrange to collect your item according to the available method.',
    },
    {
      question: isAr
        ? 'هل تخدم المنصة جميع مناطق عُمان؟'
        : 'Does the platform serve all regions of Oman?',
      answer: isAr
        ? 'نعم، منصة مزادات تخدم جميع ولايات ومحافظات سلطنة عُمان. يمكن لأي شخص في عُمان التسجيل والمشاركة في المزادات من أي مكان.'
        : 'Yes, Mzadat serves all governorates and regions of the Sultanate of Oman. Anyone in Oman can register and participate in auctions from anywhere.',
    },
  ]

  return (
    <section className="bg-gray-50 py-20 lg:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <span className="inline-block rounded-full bg-primary-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary-700">
            {isAr ? 'الأسئلة الشائعة' : 'FAQ'}
          </span>
          <h2 className="mt-4 text-2xl font-bold text-gray-900 sm:text-3xl lg:text-4xl">
            {isAr
              ? 'أسئلة متكررة حول مزادات'
              : 'Frequently Asked Questions'}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-gray-500">
            {isAr
              ? 'إجابات على أكثر الأسئلة شيوعاً حول التسجيل والمزايدة والدفع على منصة مزادات'
              : 'Answers to the most common questions about registration, bidding, and payment on the Mzadat auction platform in Oman.'}
          </p>
        </motion.div>

        {/* FAQ Items */}
        <div className="mt-12 space-y-3">
          {faqs.map((faq, index) => (
            <FAQItem key={index} faq={faq} index={index} />
          ))}
        </div>
      </div>

      {/* JSON-LD structured data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((faq) => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
              },
            })),
          }),
        }}
      />
    </section>
  )
}

// ── FAQ Accordion Item ────────────────────────────────────

function FAQItem({
  faq,
  index,
}: {
  faq: { question: string; answer: string }
  index: number
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-colors hover:border-primary-200"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-6 py-4 text-start"
        aria-expanded={isOpen}
      >
        <span className="pe-4 text-sm font-medium text-gray-900">
          {faq.question}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-100 px-6 py-4">
              <p className="text-sm leading-relaxed text-gray-500">
                {faq.answer}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
