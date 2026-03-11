import {
  Shield,
  Users,
  Target,
  Award,
  CheckCircle2,
  Globe,
  TrendingUp,
  Handshake,
} from 'lucide-react'
import { Card, CardContent } from '@mzadat/ui/components/card'
import { Badge } from '@mzadat/ui/components/badge'
import { AnimatedSection, StaggerGrid, StaggerItem, CountUpNumber } from '@/lib/motion'
import { getSiteSettings } from '@/lib/cms'

export const metadata = {
  title: 'من نحن | مزادات',
  description: 'تعرف على منصة مزادات - منصة المزادات الرائدة في سلطنة عمان',
}

export default async function AboutPage() {
  const isAr = false
  const settings = getSiteSettings()

  const values = [
    {
      icon: Shield,
      title: isAr ? 'الشفافية' : 'Transparency',
      desc: isAr
        ? 'نلتزم بأعلى معايير الشفافية في جميع عملياتنا ومزاداتنا'
        : 'We commit to the highest transparency standards in all our operations',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      icon: Handshake,
      title: isAr ? 'الثقة' : 'Trust',
      desc: isAr
        ? 'نبني علاقات ثقة مع عملائنا من خلال الالتزام والمصداقية'
        : 'We build trust through commitment and credibility',
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      icon: Target,
      title: isAr ? 'الابتكار' : 'Innovation',
      desc: isAr
        ? 'نستخدم أحدث التقنيات لتقديم تجربة مزادات متطورة وسلسة'
        : 'We use the latest technology for a seamless auction experience',
      color: 'bg-purple-50 text-purple-600',
    },
    {
      icon: Users,
      title: isAr ? 'خدمة العملاء' : 'Customer Service',
      desc: isAr
        ? 'فريق دعم متخصص لمساعدتك في كل خطوة من عملية المزايدة'
        : 'Dedicated support team to assist you at every step',
      color: 'bg-amber-50 text-amber-600',
    },
  ]

  const milestones = [
    { year: '2020', event: isAr ? 'تأسيس الشركة' : 'Company Founded' },
    { year: '2021', event: isAr ? 'إطلاق المنصة الإلكترونية' : 'Platform Launch' },
    { year: '2022', event: isAr ? 'أول 1000 مزاد ناجح' : 'First 1000 Auctions' },
    { year: '2023', event: isAr ? 'التوسع في جميع محافظات السلطنة' : 'Nationwide Expansion' },
    { year: '2024', event: isAr ? 'إطلاق المنصة الجديدة' : 'New Platform Launch' },
  ]

  const stats = [
    { value: 5000, label: isAr ? 'مزاد ناجح' : 'Successful Auctions', suffix: '+' },
    { value: 15000, label: isAr ? 'عميل مسجل' : 'Registered Users', suffix: '+' },
    { value: 500, label: isAr ? 'تاجر معتمد' : 'Verified Merchants', suffix: '+' },
    { value: 11, label: isAr ? 'محافظة' : 'Governorates', suffix: '' },
  ]

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.08),transparent_60%)]" />
        <div className="container mx-auto px-4">
          <AnimatedSection className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4 border-white/20 bg-white/10 text-white">
              {isAr ? 'من نحن' : 'About Us'}
            </Badge>
            <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl">
              {isAr
                ? 'منصة المزادات الرائدة في سلطنة عمان'
                : "Oman's Leading Auction Platform"}
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-white/80">
              {isAr
                ? 'نسعى لتقديم تجربة مزادات رقمية متكاملة تجمع بين الموثوقية والشفافية والتكنولوجيا الحديثة، لنكون الخيار الأول للمزادات في سلطنة عمان.'
                : 'We strive to deliver a comprehensive digital auction experience combining reliability, transparency, and modern technology, to be the first choice for auctions in Oman.'}
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Stats */}
      <section className="-mt-12 relative z-10">
        <div className="container mx-auto px-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, i) => (
              <AnimatedSection key={i} delay={i * 0.1}>
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-6 text-center">
                    <p className="text-3xl font-bold text-primary-700">
                      <CountUpNumber value={stat.value} />
                      {stat.suffix}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
                  </CardContent>
                </Card>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid gap-8 lg:grid-cols-2">
          <AnimatedSection delay={0.1}>
            <Card className="h-full border-0 bg-gradient-to-br from-primary-50 to-white shadow-md">
              <CardContent className="p-8">
                <div className="mb-4 inline-flex rounded-xl bg-primary-100 p-3">
                  <Target className="h-6 w-6 text-primary-700" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  {isAr ? 'رسالتنا' : 'Our Mission'}
                </h2>
                <p className="mt-4 leading-relaxed text-muted-foreground">
                  {isAr
                    ? 'تقديم منصة مزادات إلكترونية موثوقة وشفافة تتيح للأفراد والشركات في سلطنة عمان بيع وشراء الأصول بكفاءة وأمان، مع الالتزام بأعلى معايير الجودة والنزاهة.'
                    : 'To provide a reliable and transparent electronic auction platform that enables individuals and companies in Oman to buy and sell assets efficiently and securely, while adhering to the highest standards of quality and integrity.'}
                </p>
              </CardContent>
            </Card>
          </AnimatedSection>
          <AnimatedSection delay={0.2}>
            <Card className="h-full border-0 bg-gradient-to-br from-accent-50 to-white shadow-md">
              <CardContent className="p-8">
                <div className="mb-4 inline-flex rounded-xl bg-accent-100 p-3">
                  <Globe className="h-6 w-6 text-accent-600" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  {isAr ? 'رؤيتنا' : 'Our Vision'}
                </h2>
                <p className="mt-4 leading-relaxed text-muted-foreground">
                  {isAr
                    ? 'أن نكون المنصة الأولى والأكثر ثقة للمزادات الإلكترونية في منطقة الخليج العربي، ونموذجاً يحتذى به في الابتكار الرقمي وخدمة العملاء.'
                    : 'To be the most trusted and leading electronic auction platform in the GCC region, and a model of digital innovation and customer service.'}
                </p>
              </CardContent>
            </Card>
          </AnimatedSection>
        </div>
      </section>

      {/* Values */}
      <section className="bg-muted/50 py-20">
        <div className="container mx-auto px-4">
          <AnimatedSection className="mb-12 text-center">
            <Badge className="mb-3 bg-primary-100 text-primary-700">
              {isAr ? 'قيمنا' : 'Our Values'}
            </Badge>
            <h2 className="text-3xl font-bold text-foreground">
              {isAr ? 'المبادئ التي نلتزم بها' : 'Principles We Stand By'}
            </h2>
          </AnimatedSection>
          <StaggerGrid className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value, i) => (
              <StaggerItem key={i}>
                <Card className="h-full text-center transition-shadow hover:shadow-lg">
                  <CardContent className="p-6">
                    <div className={`mx-auto mb-4 inline-flex rounded-xl p-3 ${value.color}`}>
                      <value.icon className="h-6 w-6" />
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-foreground">{value.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{value.desc}</p>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* Timeline */}
      <section className="container mx-auto px-4 py-20">
        <AnimatedSection className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-foreground">
            {isAr ? 'رحلتنا' : 'Our Journey'}
          </h2>
        </AnimatedSection>
        <div className="mx-auto max-w-2xl">
          {milestones.map((m, i) => (
            <AnimatedSection key={i} delay={i * 0.15} className="flex gap-4 pb-8 last:pb-0">
              <div className="flex flex-col items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
                  {m.year.slice(-2)}
                </div>
                {i < milestones.length - 1 && <div className="mt-2 w-px flex-1 bg-primary-200" />}
              </div>
              <div className="pt-2">
                <p className="text-xs font-bold text-primary-600">{m.year}</p>
                <p className="mt-1 font-semibold text-foreground">{m.event}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* CTA */}
      <AnimatedSection>
        <section className="bg-gradient-to-r from-primary-900 to-primary-700 py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-white">
              {isAr ? 'انضم إلينا اليوم' : 'Join Us Today'}
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-white/80">
              {isAr
                ? 'سجل الآن واستمتع بتجربة مزادات احترافية وآمنة'
                : 'Register now and enjoy a professional, secure auction experience'}
            </p>
          </div>
        </section>
      </AnimatedSection>
    </div>
  )
}
