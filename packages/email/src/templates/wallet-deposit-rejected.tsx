import * as React from 'react'
import { Text, Button, Section } from '@react-email/components'
import { EmailLayout, DetailTable, styles, brand, t } from '../components/layout'

interface WalletDepositRejectedEmailProps {
  firstName: string
  amount: string
  referenceNumber: string
  reason?: string
  supportUrl?: string
  locale?: 'en' | 'ar'
}

export function WalletDepositRejectedEmail({
  firstName,
  amount,
  referenceNumber,
  reason,
  supportUrl,
  locale = 'en',
}: WalletDepositRejectedEmailProps) {
  return (
    <EmailLayout locale={locale} preview={t('Deposit rejected', 'تم رفض الإيداع', locale)}>
      <Text style={styles.heading}>
        {t(`Hi ${firstName},`, `مرحبًا ${firstName}،`, locale)}
      </Text>
      <Text style={styles.paragraph}>
        {t(
          'Unfortunately, your wallet deposit request has been rejected.',
          'للأسف، تم رفض طلب إيداعك في المحفظة.',
          locale,
        )}
      </Text>

      {/* Rejection details */}
      <Section style={styles.dangerCard}>
        <DetailTable
          rows={[
            { label: t('Amount', 'المبلغ', locale), value: `${amount} OMR` },
            { label: t('Reference', 'المرجع', locale), value: referenceNumber },
            { label: t('Status', 'الحالة', locale), value: t('Rejected', 'مرفوض', locale) },
            ...(reason
              ? [{ label: t('Reason', 'السبب', locale), value: reason }]
              : []),
          ]}
        />
      </Section>

      <Text style={styles.paragraph}>
        {t(
          'If you believe this was a mistake, please contact our support team with your reference number and deposit proof.',
          'إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع فريق الدعم مع رقم المرجع وإثبات الإيداع.',
          locale,
        )}
      </Text>

      {supportUrl && (
        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button href={supportUrl} style={styles.primaryButton}>
            {t('Contact Support', 'تواصل مع الدعم', locale)}
          </Button>
        </Section>
      )}
    </EmailLayout>
  )
}

export default WalletDepositRejectedEmail
