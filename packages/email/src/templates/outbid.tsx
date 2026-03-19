import * as React from 'react'
import { Text, Button, Section } from '@react-email/components'
import { EmailLayout, styles, brand, t } from '../components/layout'

interface OutbidEmailProps {
  firstName: string
  productName: { en: string; ar: string }
  currentBid: string
  productUrl?: string
  locale?: 'en' | 'ar'
}

export function OutbidEmail({
  firstName,
  productName,
  currentBid,
  productUrl,
  locale = 'en',
}: OutbidEmailProps) {
  const name = t(productName.en, productName.ar, locale)

  return (
    <EmailLayout locale={locale} preview={t('You have been outbid!', 'تم تجاوز مزايدتك!', locale)}>
      {/* Alert icon */}
      <Section style={{ textAlign: 'center', marginBottom: '8px' }}>
        <Text style={{ fontSize: '48px', margin: 0 }}>🔔</Text>
      </Section>

      <Text style={{ ...styles.heading, textAlign: 'center' }}>
        {t("You've Been Outbid!", 'تم تجاوز مزايدتك!', locale)}
      </Text>
      <Text style={{ ...styles.subheading, textAlign: 'center' }}>
        {t(
          `Hi ${firstName}, someone placed a higher bid.`,
          `مرحبًا ${firstName}، قدم شخص آخر مزايدة أعلى.`,
          locale,
        )}
      </Text>

      {/* Bid info card */}
      <Section style={styles.warningCard}>
        <Text style={{ ...styles.mutedText, margin: '0 0 4px', textAlign: 'center' }}>
          {t('Current Highest Bid on', 'أعلى مزايدة حالية على', locale)}
        </Text>
        <Text
          style={{
            fontSize: '16px',
            fontWeight: '700',
            color: brand.text,
            margin: '0 0 8px',
            textAlign: 'center',
          }}
        >
          {name}
        </Text>
        <Text style={{ ...styles.amountLarge, color: '#b45309', textAlign: 'center' }}>
          {currentBid} OMR
        </Text>
      </Section>

      <Text style={{ ...styles.paragraph, textAlign: 'center' }}>
        {t(
          "Act fast! Place a higher bid to stay in the lead.",
          'تصرف بسرعة! قدم مزايدة أعلى للبقاء في الصدارة.',
          locale,
        )}
      </Text>

      {productUrl && (
        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button href={productUrl} style={{ ...styles.primaryButton, backgroundColor: '#b45309' }}>
            {t('Bid Now', 'زايد الآن', locale)}
          </Button>
        </Section>
      )}

      <Text style={styles.mutedText}>
        {t(
          'Tip: Watch the auction closely — anti-sniping rules may extend the auction if bids come in during the final minutes.',
          'نصيحة: راقب المزاد عن كثب — قواعد منع المزايدة الأخيرة قد تمدد المزاد إذا وردت مزايدات في الدقائق الأخيرة.',
          locale,
        )}
      </Text>
    </EmailLayout>
  )
}

export default OutbidEmail
