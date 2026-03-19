import * as React from 'react'
import { Text, Button, Section } from '@react-email/components'
import { EmailLayout, DetailTable, styles, brand, t } from '../components/layout'

interface AuctionWonEmailProps {
  firstName: string
  productName: { en: string; ar: string }
  bidAmount: string
  taxAmount: string
  totalAmount: string
  orderNumber: string
  paymentDays: number
  productUrl?: string
  locale?: 'en' | 'ar'
}

export function AuctionWonEmail({
  firstName,
  productName,
  bidAmount,
  taxAmount,
  totalAmount,
  orderNumber,
  paymentDays,
  productUrl,
  locale = 'en',
}: AuctionWonEmailProps) {
  const name = t(productName.en, productName.ar, locale)

  return (
    <EmailLayout locale={locale} preview={t('You won the auction!', 'لقد فزت بالمزاد!', locale)}>
      {/* Trophy icon */}
      <Section style={{ textAlign: 'center', marginBottom: '8px' }}>
        <Text style={{ fontSize: '48px', margin: 0 }}>🏆</Text>
      </Section>

      <Text style={{ ...styles.heading, textAlign: 'center' }}>
        {t(`Congratulations, ${firstName}!`, `تهانينا، ${firstName}!`, locale)}
      </Text>
      <Text style={{ ...styles.subheading, textAlign: 'center' }}>
        {t('You won the auction!', 'لقد فزت بالمزاد!', locale)}
      </Text>

      {/* Product card */}
      <Section style={styles.successCard}>
        <Text style={{ ...styles.mutedText, margin: '0 0 4px', textAlign: 'center' }}>
          {t('Winning Item', 'المنتج الفائز', locale)}
        </Text>
        <Text
          style={{
            fontSize: '18px',
            fontWeight: '700',
            color: brand.text,
            margin: '0 0 4px',
            textAlign: 'center',
          }}
        >
          {name}
        </Text>
        <Text style={{ ...styles.mutedText, margin: 0, textAlign: 'center' }}>
          {t('Order', 'الطلب', locale)}: {orderNumber}
        </Text>
      </Section>

      {/* Payment Details */}
      <Text style={{ ...styles.paragraph, fontWeight: '600', marginBottom: '12px' }}>
        {t('Payment Summary', 'ملخص الدفع', locale)}
      </Text>

      <DetailTable
        rows={[
          { label: t('Winning Bid (incl. VAT)', 'المزايدة الفائزة (شامل الضريبة)', locale), value: `${totalAmount} OMR`, bold: true },
          { label: t('VAT (5%) included', 'الضريبة (5%) مشمولة', locale), value: `${taxAmount} OMR` },
        ]}
      />

      {/* Deadline warning */}
      <Section style={styles.warningCard}>
        <Text style={{ fontSize: '14px', color: '#92400e', margin: 0, fontWeight: '600' }}>
          ⏰ {t(
            `Please complete payment within ${paymentDays} business days to secure your item.`,
            `يرجى إكمال الدفع خلال ${paymentDays} أيام عمل لضمان منتجك.`,
            locale,
          )}
        </Text>
      </Section>

      {/* CTA */}
      {productUrl && (
        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button href={productUrl} style={styles.successButton}>
            {t('Complete Payment', 'إتمام الدفع', locale)}
          </Button>
        </Section>
      )}

      <Text style={styles.mutedText}>
        {t(
          'If you have any questions about your winning bid or payment process, please contact our support team.',
          'إذا كان لديك أي أسئلة حول مزايدتك الفائزة أو عملية الدفع، يرجى التواصل مع فريق الدعم.',
          locale,
        )}
      </Text>
    </EmailLayout>
  )
}

export default AuctionWonEmail
