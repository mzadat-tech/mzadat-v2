import * as React from 'react'
import { Text, Button, Section } from '@react-email/components'
import { EmailLayout, styles, brand, t } from '../components/layout'

interface AuctionLostEmailProps {
  firstName: string
  productName: { en: string; ar: string }
  refundAmount?: string
  groupName?: { en: string; ar: string }
  browseUrl?: string
  locale?: 'en' | 'ar'
}

export function AuctionLostEmail({
  firstName,
  productName,
  refundAmount,
  groupName,
  browseUrl,
  locale = 'en',
}: AuctionLostEmailProps) {
  const name = t(productName.en, productName.ar, locale)

  return (
    <EmailLayout locale={locale} preview={t('Auction has ended', 'انتهى المزاد', locale)}>
      <Text style={styles.heading}>
        {t(`Hi ${firstName},`, `مرحبًا ${firstName}،`, locale)}
      </Text>
      <Text style={styles.paragraph}>
        {t(
          `The auction for "${name}" has ended and another bidder has won.`,
          `انتهى المزاد على "${name}" وقد فاز مزايد آخر.`,
          locale,
        )}
      </Text>

      {refundAmount && (
        <Section style={styles.successCard}>
          <Text style={{ fontSize: '14px', color: '#166534', margin: 0, fontWeight: '600' }}>
            💰 {t(
              `Your deposit of ${refundAmount} OMR${groupName ? ` for "${t(groupName.en, groupName.ar, locale)}"` : ''} has been refunded to your wallet.`,
              `تم استرداد تأمينك بقيمة ${refundAmount} ر.ع.${groupName ? ` لـ "${t(groupName.en, groupName.ar, locale)}"` : ''} إلى محفظتك.`,
              locale,
            )}
          </Text>
        </Section>
      )}

      <Text style={styles.paragraph}>
        {t(
          "Don't worry — there are many more auctions waiting for you! Browse our latest listings and find your next opportunity.",
          'لا تقلق — هناك العديد من المزادات الأخرى في انتظارك! تصفح أحدث القوائم وابحث عن فرصتك القادمة.',
          locale,
        )}
      </Text>

      {browseUrl && (
        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button href={browseUrl} style={styles.primaryButton}>
            {t('Browse Auctions', 'تصفح المزادات', locale)}
          </Button>
        </Section>
      )}
    </EmailLayout>
  )
}

export default AuctionLostEmail
