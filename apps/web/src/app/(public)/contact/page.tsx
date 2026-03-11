'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  MessageSquare,
  ChevronDown,
} from 'lucide-react'
import { Card, CardContent } from '@mzadat/ui/components/card'
import { Input } from '@mzadat/ui/components/input'
import { Label } from '@mzadat/ui/components/label'
import { Button } from '@mzadat/ui'
import { Badge } from '@mzadat/ui/components/badge'
import { Separator } from '@mzadat/ui/components/separator'
import { fadeInUp, staggerContainer, staggerItem, AnimatedSection } from '@/lib/motion'
import { toast } from 'sonner'

export default function ContactPage() {
  const isAr = false
  const [sending, setSending] = useState(false)

  const contactInfo = [
    {
      icon: Phone,
      label: isAr ? 'الهاتف' : 'Phone',
      value: '+968 2412 3456',
      href: 'tel:+96824123456',
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      icon: Mail,
      label: isAr ? 'البريد الإلكتروني' : 'Email',
      value: 'info@mzadat.om',
      href: 'mailto:info@mzadat.om',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      icon: MapPin,
      label: isAr ? 'العنوان' : 'Address',
      value: isAr ? 'مسقط، سلطنة عمان' : 'Muscat, Sultanate of Oman',
      color: 'bg-purple-50 text-purple-600',
    },
    {
      icon: Clock,
      label: isAr ? 'ساعات العمل' : 'Working Hours',
      value: isAr
        ? 'الأحد - الخميس: 8:00 ص - 5:00 م'
        : 'Sun - Thu: 8:00 AM - 5:00 PM',
      color: 'bg-amber-50 text-amber-600',
    },
  ]

  const faqs = [
    {
      q: isAr ? 'كيف أسجل في المنصة؟' : 'How do I register?',
      a: isAr
        ? 'يمكنك التسجيل من خلال صفحة التسجيل وإدخال بياناتك الشخصية ورفع المستندات المطلوبة.'
        : 'You can register through the registration page by entering your details and uploading required documents.',
    },
    {
      q: isAr ? 'كيف أشارك في مزاد؟' : 'How do I participate in an auction?',
      a: isAr
        ? 'بعد التسجيل والتحقق من حسابك، يمكنك دفع تأمين المزاد والبدء بالمزايدة.'
        : 'After registering and verifying your account, you can pay the auction deposit and start bidding.',
    },
    {
      q: isAr ? 'ما هي طرق الدفع المتاحة؟' : 'What payment methods are available?',
      a: isAr
        ? 'نقبل التحويل البنكي والدفع عبر البطاقات الائتمانية ومحفظة المنصة.'
        : 'We accept bank transfer, credit cards, and platform wallet.',
    },
    {
      q: isAr ? 'كيف أسترد التأمين؟' : 'How do I get my deposit back?',
      a: isAr
        ? 'يتم استرداد التأمين تلقائياً بعد انتهاء المزاد إذا لم تكن الفائز.'
        : 'Deposits are automatically refunded after the auction ends if you are not the winner.',
    },
  ]

  const [openFaq, setOpenFaq] = useState<number | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    await new Promise((r) => setTimeout(r, 2000))
    setSending(false)
    toast.success(isAr ? 'تم إرسال رسالتك بنجاح! سنتواصل معك قريباً.' : 'Message sent! We will contact you soon.')
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(255,255,255,0.1),transparent_50%)]" />
        <div className="container mx-auto px-4 text-center">
          <AnimatedSection>
            <Badge className="mb-4 border-white/20 bg-white/10 text-white">
              <MessageSquare className="me-1.5 h-3 w-3" />
              {isAr ? 'تواصل معنا' : 'Contact Us'}
            </Badge>
            <h1 className="text-4xl font-bold text-white md:text-5xl">
              {isAr ? 'تواصل معنا' : 'Get in Touch'}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
              {isAr
                ? 'فريقنا جاهز لمساعدتك والإجابة على جميع استفساراتك'
                : 'Our team is ready to help and answer all your questions'}
            </p>
          </AnimatedSection>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="grid gap-12 lg:grid-cols-2">
          {/* Contact Form */}
          <AnimatedSection delay={0.1}>
            <Card>
              <CardContent className="p-8">
                <h2 className="mb-6 text-xl font-bold text-foreground">
                  {isAr ? 'أرسل لنا رسالة' : 'Send us a Message'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{isAr ? 'الاسم' : 'Name'}</Label>
                      <Input required placeholder={isAr ? 'أدخل اسمك' : 'Your name'} />
                    </div>
                    <div className="space-y-2">
                      <Label>{isAr ? 'البريد الإلكتروني' : 'Email'}</Label>
                      <Input required type="email" placeholder="email@example.com" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{isAr ? 'رقم الهاتف' : 'Phone'}</Label>
                    <Input type="tel" placeholder="+968 xxxx xxxx" dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label>{isAr ? 'الموضوع' : 'Subject'}</Label>
                    <Input required placeholder={isAr ? 'موضوع الرسالة' : 'Message subject'} />
                  </div>
                  <div className="space-y-2">
                    <Label>{isAr ? 'الرسالة' : 'Message'}</Label>
                    <textarea
                      required
                      rows={5}
                      placeholder={isAr ? 'اكتب رسالتك هنا...' : 'Write your message here...'}
                      className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={sending}
                    className="w-full gap-2 sm:w-auto"
                    size="lg"
                  >
                    <Send className="h-4 w-4" />
                    {sending
                      ? isAr ? 'جاري الإرسال...' : 'Sending...'
                      : isAr ? 'إرسال الرسالة' : 'Send Message'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </AnimatedSection>

          {/* Contact Info & FAQ */}
          <div className="space-y-8">
            {/* Contact Details */}
            <AnimatedSection delay={0.2}>
              <div className="grid gap-4 sm:grid-cols-2">
                {contactInfo.map((info, i) => (
                  <Card key={i} className="transition-shadow hover:shadow-md">
                    <CardContent className="p-5">
                      <div className={`mb-3 inline-flex rounded-xl p-2.5 ${info.color}`}>
                        <info.icon className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-medium text-muted-foreground">{info.label}</p>
                      {info.href ? (
                        <a
                          href={info.href}
                          className="mt-1 block text-sm font-semibold text-foreground hover:text-primary-600"
                          dir="ltr"
                        >
                          {info.value}
                        </a>
                      ) : (
                        <p className="mt-1 text-sm font-semibold text-foreground">{info.value}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </AnimatedSection>

            {/* FAQ */}
            <AnimatedSection delay={0.3}>
              <h2 className="mb-4 text-xl font-bold text-foreground">
                {isAr ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
              </h2>
              <div className="space-y-3">
                {faqs.map((faq, i) => (
                  <Card key={i} className="overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="flex w-full items-center justify-between p-4 text-start"
                    >
                      <span className="text-sm font-semibold text-foreground">{faq.q}</span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                          openFaq === i ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {openFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="overflow-hidden border-t border-border"
                      >
                        <p className="p-4 text-sm text-muted-foreground">{faq.a}</p>
                      </motion.div>
                    )}
                  </Card>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Map Placeholder */}
      <section className="h-80 w-full bg-muted">
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <MapPin className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {isAr ? 'خريطة الموقع' : 'Map Location'}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
