import * as React from 'react'
import { Text, Button, Section } from '@react-email/components'
import { EmailLayout, DetailTable, styles, brand, t } from '../components/layout'

interface PaymentReminderEmailProps {
  firstName: string
  productName: { en: string; ar: string }
  orderNumber: string
  totalAmount: string
  daysLeft: number
  productUrl?: string
  locale?: 'en' | 'ar'
}

export function PaymentReminderEmail({
  firstName,
  productName,
  orderNumber,
  totalAmount,
  daysLeft,
  productUrl,
  locale = 'en',
}: PaymentReminderEmailProps) {
  const name = t(productName.en, productName.ar, locale)
  const isUrgent = daysLeft <= 1

  return (
    <EmailLayout locale={locale} preview={t('Payment reminder', 'تذكير بالدفع', locale)}>
      {/* Clock icon */}
      <Section style={{ textAlign: 'center', marginBottom: '8px' }}>
        <Text style={{ fontSize: '48px', margin: 0 }}>{isUrgent ? '🚨' : '⏰'}</Text>
      </Section>

      <Text style={{ ...styles.heading, textAlign: 'center' }}>
        {t('Payment Reminder', 'تذكير بالدفع', locale)}
      </Text>
      <Text style={{ ...styles.subheading, textAlign: 'center' }}>
        {t(`Hi ${firstName}, don't lose your winning item!`, `مرحبًا ${firstName}، لا تفقد منتجك الفائز!`, locale)}
      </Text>

      {/* Urgency card */}
      <Section style={isUrgent ? styles.dangerCard : styles.warningCard}>
        <Text
          style={{
            fontSize: '14px',
            color: isUrgent ? '#991b1b' : '#92400e',
            margin: 0,
            fontWeight: '600',
            textAlign: 'center',
          }}
        >
          {isUrgent
            ? t(
              '⚠️ URGENT: Payment due today! Failure to pay may result in forfeiture.',
              '⚠️ عاجل: الدفع مستحق اليوم! عدم الدفع قد يؤدي إلى مصادرة المنتج.',
              locale,
            )
            : t(
              `You have ${daysLeft} day(s) left to complete your payment.`,
              `لديك ${daysLeft} يوم/أيام متبقية لإكمال الدفع.`,
              locale,
            )}
        </Text>
      </Section>

      <DetailTable
        rows={[
          { label: t('Item', 'المنتج', locale), value: name },
          { label: t('Order', 'الطلب', locale), value: orderNumber },
          { label: t('Amount Due', 'المبلغ المستحق', locale), value: `${totalAmount} OMR`, bold: true },
          { label: t('Days Remaining', 'الأيام المتبقية', locale), value: `${daysLeft}` },
        ]}
      />

      {productUrl && (
        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button href={productUrl} style={isUrgent ? { ...styles.primaryButton, backgroundColor: brand.danger } : styles.primaryButton}>
            {t('Complete Payment Now', 'أكمل الدفع الآن', locale)}
          </Button>
        </Section>
      )}
    </EmailLayout>
  )
}

export default PaymentReminderEmail
