import * as React from 'react'
import { Text, Button, Section } from '@react-email/components'
import { EmailLayout, DetailTable, styles, brand, t } from '../components/layout'

interface WalletDepositApprovedEmailProps {
  firstName: string
  amount: string
  referenceNumber: string
  newBalance?: string
  walletUrl?: string
  locale?: 'en' | 'ar'
}

export function WalletDepositApprovedEmail({
  firstName,
  amount,
  referenceNumber,
  newBalance,
  walletUrl,
  locale = 'en',
}: WalletDepositApprovedEmailProps) {
  return (
    <EmailLayout locale={locale} preview={t('Deposit approved', 'تمت الموافقة على الإيداع', locale)}>
      {/* Success icon */}
      <Section style={{ textAlign: 'center', marginBottom: '8px' }}>
        <Text style={{ fontSize: '48px', margin: 0 }}>💰</Text>
      </Section>

      <Text style={{ ...styles.heading, textAlign: 'center' }}>
        {t('Deposit Approved!', 'تمت الموافقة على الإيداع!', locale)}
      </Text>
      <Text style={{ ...styles.subheading, textAlign: 'center' }}>
        {t(
          `Hi ${firstName}, your funds have been added to your wallet.`,
          `مرحبًا ${firstName}، تمت إضافة الأموال إلى محفظتك.`,
          locale,
        )}
      </Text>

      {/* Amount card */}
      <Section style={styles.successCard}>
        <Text style={{ ...styles.mutedText, margin: '0 0 4px', textAlign: 'center' }}>
          {t('Amount Credited', 'المبلغ المضاف', locale)}
        </Text>
        <Text style={{ ...styles.amountLarge, color: brand.success, textAlign: 'center' }}>
          +{amount} OMR
        </Text>
      </Section>

      <DetailTable
        rows={[
          { label: t('Reference', 'المرجع', locale), value: referenceNumber },
          { label: t('Status', 'الحالة', locale), value: t('Approved', 'تمت الموافقة', locale) },
          ...(newBalance
            ? [{ label: t('New Balance', 'الرصيد الجديد', locale), value: `${newBalance} OMR`, bold: true }]
            : []),
        ]}
      />

      <Text style={{ ...styles.paragraph, marginTop: '24px' }}>
        {t(
          'Your wallet is ready for bidding. Explore our latest auctions!',
          'محفظتك جاهزة للمزايدة. اكتشف أحدث المزادات!',
          locale,
        )}
      </Text>

      {walletUrl && (
        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button href={walletUrl} style={styles.primaryButton}>
            {t('View Wallet', 'عرض المحفظة', locale)}
          </Button>
        </Section>
      )}
    </EmailLayout>
  )
}

export default WalletDepositApprovedEmail
