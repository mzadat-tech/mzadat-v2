import * as React from 'react'
import { Text, Button, Section } from '@react-email/components'
import { EmailLayout, styles, brand, t } from '../components/layout'

interface DepositRefundEmailProps {
  firstName: string
  amount: string
  groupName: { en: string; ar: string }
  reason?: 'non_winner' | 'reserve_not_met' | 'auction_cancelled'
  walletUrl?: string
  browseUrl?: string
  locale?: 'en' | 'ar'
}

const reasonMessages = {
  non_winner: {
    en: 'The auction has ended and another bidder won.',
    ar: 'انتهى المزاد وفاز مزايد آخر.',
  },
  reserve_not_met: {
    en: 'The reserve price was not met and the auction closed without a winner.',
    ar: 'لم يتم الوصول إلى السعر الاحتياطي وأُغلق المزاد بدون فائز.',
  },
  auction_cancelled: {
    en: 'The auction was cancelled by the organizer.',
    ar: 'تم إلغاء المزاد من قبل المنظم.',
  },
} as const

export function DepositRefundEmail({
  firstName,
  amount,
  groupName,
  reason = 'non_winner',
  walletUrl,
  browseUrl,
  locale = 'en',
}: DepositRefundEmailProps) {
  const gName = t(groupName.en, groupName.ar, locale)
  const reasonMsg = t(reasonMessages[reason].en, reasonMessages[reason].ar, locale)

  return (
    <EmailLayout locale={locale} preview={t('Deposit refunded', 'تم استرداد التأمين', locale)}>
      <Text style={styles.heading}>
        {t(`Hi ${firstName},`, `مرحبًا ${firstName}،`, locale)}
      </Text>
      <Text style={styles.paragraph}>{reasonMsg}</Text>

      {/* Refund amount card */}
      <Section style={styles.successCard}>
        <Text style={{ ...styles.mutedText, margin: '0 0 4px', textAlign: 'center' }}>
          {t('Refunded to Your Wallet', 'تم الاسترداد إلى محفظتك', locale)}
        </Text>
        <Text style={{ ...styles.amountLarge, color: brand.success, textAlign: 'center' }}>
          {amount} OMR
        </Text>
        <Text style={{ ...styles.mutedText, margin: '4px 0 0', textAlign: 'center' }}>
          {t(`From group: "${gName}"`, `من المجموعة: "${gName}"`, locale)}
        </Text>
      </Section>

      <Text style={styles.paragraph}>
        {t(
          'The deposit has been instantly credited back to your Mzadat wallet. You can use it for future auctions.',
          'تم إعادة التأمين فورًا إلى محفظتك في مزادات. يمكنك استخدامه في مزادات مستقبلية.',
          locale,
        )}
      </Text>

      <Section style={{ textAlign: 'center', margin: '28px 0' }}>
        {walletUrl && (
          <Button href={walletUrl} style={{ ...styles.primaryButton, marginRight: '8px' }}>
            {t('View Wallet', 'عرض المحفظة', locale)}
          </Button>
        )}
        {browseUrl && (
          <>
            <Text style={{ ...styles.mutedText, margin: '12px 0' }}>
              {t('or', 'أو', locale)}
            </Text>
            <Button href={browseUrl} style={{ ...styles.primaryButton, backgroundColor: brand.text }}>
              {t('Browse Auctions', 'تصفح المزادات', locale)}
            </Button>
          </>
        )}
      </Section>
    </EmailLayout>
  )
}

export default DepositRefundEmail
