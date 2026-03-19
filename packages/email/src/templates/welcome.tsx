import * as React from 'react'
import { Text, Button, Section } from '@react-email/components'
import { EmailLayout, styles, brand, t } from '../components/layout'

interface WelcomeEmailProps {
  firstName: string
  browseUrl?: string
  locale?: 'en' | 'ar'
}

export function WelcomeEmail({ firstName, browseUrl, locale = 'en' }: WelcomeEmailProps) {
  return (
    <EmailLayout locale={locale} preview={t('Welcome to Mzadat!', 'مرحبًا بك في مزادات!', locale)}>
      {/* Wave icon */}
      <Section style={{ textAlign: 'center', marginBottom: '8px' }}>
        <Text style={{ fontSize: '48px', margin: 0 }}>👋</Text>
      </Section>

      <Text style={{ ...styles.heading, textAlign: 'center' }}>
        {t(`Welcome, ${firstName}!`, `مرحبًا بك، ${firstName}!`, locale)}
      </Text>
      <Text style={{ ...styles.subheading, textAlign: 'center' }}>
        {t(
          "Thank you for joining Mzadat — Oman's leading online auction platform.",
          'شكرًا لانضمامك إلى مزادات — منصة المزادات الإلكترونية الرائدة في سلطنة عمان.',
          locale,
        )}
      </Text>

      {/* Steps card */}
      <Section style={styles.infoCard}>
        <Text style={{ ...styles.paragraph, fontWeight: '600', margin: '0 0 12px' }}>
          {t('Get started in 3 steps:', 'ابدأ في 3 خطوات:', locale)}
        </Text>
        <Text style={{ ...styles.paragraph, margin: '0 0 8px' }}>
          {t('1️⃣  Fund your wallet to place deposits', '1️⃣  اشحن محفظتك لوضع التأمينات', locale)}
        </Text>
        <Text style={{ ...styles.paragraph, margin: '0 0 8px' }}>
          {t('2️⃣  Register for an auction group', '2️⃣  سجل في مجموعة مزاد', locale)}
        </Text>
        <Text style={{ ...styles.paragraph, margin: 0 }}>
          {t('3️⃣  Start bidding and win!', '3️⃣  ابدأ المزايدة واربح!', locale)}
        </Text>
      </Section>

      <Section style={{ textAlign: 'center', margin: '28px 0' }}>
        <Button href={browseUrl || `https://${brand.domain}`} style={styles.primaryButton}>
          {t('Browse Auctions', 'تصفح المزادات', locale)}
        </Button>
      </Section>

      <Text style={styles.mutedText}>
        {t(
          'Need help? Contact our support team anytime.',
          'تحتاج مساعدة؟ تواصل مع فريق الدعم في أي وقت.',
          locale,
        )}
      </Text>
    </EmailLayout>
  )
}

export default WelcomeEmail
