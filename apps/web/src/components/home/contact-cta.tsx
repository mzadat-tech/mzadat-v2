'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Phone, Mail, MapPin, MessageCircle, ArrowRight, ArrowLeft } from 'lucide-react'
import { Button } from '@mzadat/ui'

interface ContactCTAProps {
  locale: string
  direction: 'rtl' | 'ltr'
}

export function ContactCTA({ locale, direction }: ContactCTAProps) {
  const isAr = locale === 'ar'
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight

  const contactMethods = [
    {
      icon: <Phone className="h-5 w-5" />,
      title: isAr ? 'اتصل بنا' : 'Call Us',
      description: isAr ? 'متاحون من ٩ ص - ٩ م' : 'Available 9 AM – 9 PM',
      action: isAr ? 'اتصل الآن' : 'Call Now',
      href: 'tel:+96899999999',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      icon: <Mail className="h-5 w-5" />,
      title: isAr ? 'راسلنا' : 'Email Us',
      description: isAr ? 'نرد خلال ٢٤ ساعة' : 'We reply within 24 hours',
      action: isAr ? 'أرسل بريد' : 'Send Email',
      href: 'mailto:support@mzadat.om',
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      icon: <MessageCircle className="h-5 w-5" />,
      title: isAr ? 'واتساب' : 'WhatsApp',
      description: isAr ? 'دردشة فورية' : 'Instant messaging',
      action: isAr ? 'ابدأ محادثة' : 'Start Chat',
      href: 'https://wa.me/96899999999',
      color: 'bg-green-50 text-green-600',
    },
    {
      icon: <MapPin className="h-5 w-5" />,
      title: isAr ? 'زرنا' : 'Visit Us',
      description: isAr ? 'مسقط، سلطنة عُمان' : 'Muscat, Sultanate of Oman',
      action: isAr ? 'الموقع' : 'Directions',
      href: '/contact',
      color: 'bg-amber-50 text-amber-600',
    },
  ]

  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          {/* Left — CTA content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block rounded-full bg-primary-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary-700">
              {isAr ? 'تواصل معنا' : 'Get in Touch'}
            </span>
            <h2 className="mt-4 text-2xl font-bold text-gray-900 sm:text-3xl lg:text-4xl">
              {isAr
                ? 'هل لديك سؤال؟ نحن هنا للمساعدة'
                : 'Have a Question? We\'re Here to Help'}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-gray-500">
              {isAr
                ? 'فريق دعم مزادات جاهز لمساعدتك في أي استفسار حول المزايدة، التسجيل، أو الدفع. تواصل معنا عبر أي من القنوات التالية'
                : 'The Mzadat support team is ready to assist you with any questions about bidding, registration, or payments. Reach out through any of the following channels.'}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link href="/contact">
                  {isAr ? 'صفحة التواصل' : 'Contact Page'}
                  <ArrowIcon className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-2">
                <Link href="/auth/register">
                  {isAr ? 'سجل مجاناً' : 'Register Free'}
                </Link>
              </Button>
            </div>
          </motion.div>

          {/* Right — Contact method cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {contactMethods.map((method, index) => (
              <motion.a
                key={index}
                href={method.href}
                target={method.href.startsWith('http') ? '_blank' : undefined}
                rel={method.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.08 }}
                className="group rounded-2xl border border-gray-100 bg-gray-50/50 p-5 transition-all hover:border-primary-200 hover:bg-white hover:shadow-md"
              >
                <div
                  className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${method.color} transition-transform group-hover:scale-110`}
                >
                  {method.icon}
                </div>
                <h3 className="text-sm font-semibold text-gray-900">
                  {method.title}
                </h3>
                <p className="mt-1 text-xs text-gray-400">{method.description}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary-600">
                  {method.action}
                  <ArrowIcon className="h-3 w-3" />
                </span>
              </motion.a>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
