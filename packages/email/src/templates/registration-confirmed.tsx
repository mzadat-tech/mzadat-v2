import * as React from 'react'
import { Text, Button, Section } from '@react-email/components'
import { EmailLayout, DetailTable, styles, brand, t } from '../components/layout'

interface RegistrationConfirmedEmailProps {
  firstName: string
  groupName: { en: string; ar: string }
  orderNumber: string
  depositAmount: string
  taxAmount: string
  totalAmount: string
  isVipFree: boolean
  lotCount: number
  groupUrl?: string
  locale?: 'en' | 'ar'
}

export function RegistrationConfirmedEmail({
  firstName,
  groupName,
  orderNumber,
  depositAmount,
  taxAmount,
  totalAmount,
  isVipFree,
  lotCount,
  groupUrl,
  locale = 'en',
}: RegistrationConfirmedEmailProps) {
  const gName = t(groupName.en, groupName.ar, locale)

  return (
    <EmailLayout
      locale={locale}
      preview={t('Registration confirmed', 'تم تأكيد التسجيل', locale)}
    >
      {/* Check icon */}
      <Section style={{ textAlign: 'center', marginBottom: '8px' }}>
        <Text style={{ fontSize: '48px', margin: 0 }}>✅</Text>
      </Section>

      <Text style={{ ...styles.heading, textAlign: 'center' }}>
        {t('Registration Confirmed', 'تم تأكيد التسجيل', locale)}
      </Text>
      <Text style={{ ...styles.subheading, textAlign: 'center' }}>
        {t(`Hi ${firstName}, you're all set!`, `مرحبًا ${firstName}، أنت جاهز!`, locale)}
      </Text>

      {/* Group info card */}
      <Section style={styles.infoCard}>
        <Text style={{ ...styles.mutedText, margin: '0 0 4px', textAlign: 'center' }}>
          {t('Auction Group', 'مجموعة المزاد', locale)}
        </Text>
        <Text
          style={{
            fontSize: '18px',
            fontWeight: '700',
            color: brand.text,
            margin: '0 0 8px',
            textAlign: 'center',
          }}
        >
          {gName}
        </Text>
        <Text style={{ ...styles.mutedText, margin: 0, textAlign: 'center' }}>
          {t(`${lotCount} lot(s) available for bidding`, `${lotCount} قطعة متاحة للمزايدة`, locale)}
        </Text>
      </Section>

      {/* Receipt */}
      <Text style={{ ...styles.paragraph, fontWeight: '600', marginBottom: '12px' }}>
        {t('Deposit Receipt', 'إيصال التأمين', locale)}
      </Text>

      <DetailTable
        rows={[
          { label: t('Order Number', 'رقم الطلب', locale), value: orderNumber },
          {
            label: t('Status', 'الحالة', locale),
            value: isVipFree
              ? t('VIP — Free', 'VIP — مجاني', locale)
              : t('Paid', 'مدفوع', locale),
          },
          { label: t('Deposit Amount', 'مبلغ التأمين', locale), value: `${depositAmount} OMR` },
          ...(isVipFree
            ? [{ label: t('VIP Discount', 'خصم VIP', locale), value: `-${depositAmount} OMR` }]
            : []),
          ...(!isVipFree
            ? [{ label: t('Tax (VAT)', 'الضريبة', locale), value: `${taxAmount} OMR` }]
            : []),
          {
            label: t('Total Charged', 'المبلغ المخصوم', locale),
            value: isVipFree ? '0.000 OMR' : `${totalAmount} OMR`,
            bold: true,
          },
        ]}
      />

      <Text style={{ ...styles.paragraph, marginTop: '24px' }}>
        {t(
          'You can now bid on all lots in this group. Good luck!',
          'يمكنك الآن المزايدة على جميع القطع في هذه المجموعة. حظًا سعيدًا!',
          locale,
        )}
      </Text>

      {groupUrl && (
        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button href={groupUrl} style={styles.primaryButton}>
            {t('View Auction Group', 'عرض مجموعة المزاد', locale)}
          </Button>
        </Section>
      )}
    </EmailLayout>
  )
}

export default RegistrationConfirmedEmail
