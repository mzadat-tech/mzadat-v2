import * as React from 'react'
import { Text, Section } from '@react-email/components'
import { EmailLayout, styles, brand, t } from '../components/layout'

interface WalletCreditedEmailProps {
  firstName: string
  amount: string
  description: string
  referenceNumber?: string
  newBalance?: string
  locale?: 'en' | 'ar'
}

export function WalletCreditedEmail({
  firstName,
  amount,
  description,
  referenceNumber,
  newBalance,
  locale = 'en',
}: WalletCreditedEmailProps) {
  return (
    <EmailLayout locale={locale} preview={t('Wallet credited', 'تم شحن المحفظة', locale)}>
      <Text style={styles.heading}>
        {t(`Hi ${firstName},`, `مرحبًا ${firstName}،`, locale)}
      </Text>
      <Text style={styles.paragraph}>
        {t(
          'Your wallet has been credited.',
          'تمت إضافة مبلغ إلى محفظتك.',
          locale,
        )}
      </Text>

      <Section style={styles.successCard}>
        <Text style={{ ...styles.mutedText, margin: '0 0 4px', textAlign: 'center' }}>
          {t('Amount Credited', 'المبلغ المضاف', locale)}
        </Text>
        <Text style={{ ...styles.amountLarge, color: brand.success, textAlign: 'center' }}>
          +{amount} OMR
        </Text>
        <Text style={{ ...styles.mutedText, margin: '8px 0 0', textAlign: 'center' }}>
          {description}
        </Text>
        {referenceNumber && (
          <Text style={{ ...styles.mutedText, margin: '4px 0 0', textAlign: 'center' }}>
            {t('Ref', 'المرجع', locale)}: {referenceNumber}
          </Text>
        )}
        {newBalance && (
          <Text
            style={{
              fontSize: '13px',
              color: brand.text,
              fontWeight: '600',
              margin: '12px 0 0',
              textAlign: 'center',
              padding: '8px 0 0',
              borderTop: `1px solid ${brand.border}`,
            }}
          >
            {t('New Balance', 'الرصيد الجديد', locale)}: {newBalance} OMR
          </Text>
        )}
      </Section>
    </EmailLayout>
  )
}

export default WalletCreditedEmail
