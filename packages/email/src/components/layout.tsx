import * as React from 'react'
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Img,
  Text,
  Hr,
  Link,
} from '@react-email/components'

// ── Brand Constants ──────────────────────────────────────
export const brand = {
  name: 'Mzadat',
  nameAr: 'مزادات',
  domain: 'mzadat.om',
  email: 'info@mzadat.om',
  phone: '+968 2400 0000',
  address: 'Muscat, Sultanate of Oman',

  // Colors
  primary: '#12456e',
  primaryDark: '#12456e',
  success: '#16a34a',
  warning: '#f59e0b',
  danger: '#dc2626',
  bg: '#f4f4f5',
  cardBg: '#ffffff',
  text: '#1f2937',
  textMuted: '#6b7280',
  textLight: '#9ca3af',
  border: '#e5e7eb',
  divider: '#e5e7eb',
} as const

// ── Shared Styles ────────────────────────────────────────
export const styles = {
  body: {
    fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    backgroundColor: brand.bg,
    margin: 0,
    padding: 0,
  } as React.CSSProperties,
  outerContainer: {
    maxWidth: '600px',
    margin: '0 auto',
    backgroundColor: brand.cardBg,
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  } as React.CSSProperties,
  header: {
    backgroundColor: brand.primary,
    padding: '28px 40px',
    textAlign: 'center' as const,
  } as React.CSSProperties,
  headerLogo: {
    margin: '0 auto',
  } as React.CSSProperties,
  content: {
    padding: '36px 40px 24px',
  } as React.CSSProperties,
  heading: {
    fontSize: '22px',
    fontWeight: '700' as const,
    color: brand.text,
    margin: '0 0 8px',
    lineHeight: '1.3',
  } as React.CSSProperties,
  subheading: {
    fontSize: '15px',
    color: brand.textMuted,
    margin: '0 0 28px',
    lineHeight: '1.5',
  } as React.CSSProperties,
  paragraph: {
    fontSize: '15px',
    color: brand.text,
    lineHeight: '1.6',
    margin: '0 0 16px',
  } as React.CSSProperties,
  mutedText: {
    fontSize: '13px',
    color: brand.textMuted,
    lineHeight: '1.5',
  } as React.CSSProperties,
  primaryButton: {
    backgroundColor: brand.primary,
    color: '#ffffff',
    padding: '14px 32px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600' as const,
    fontSize: '15px',
    display: 'inline-block',
    textAlign: 'center' as const,
  } as React.CSSProperties,
  successButton: {
    backgroundColor: brand.success,
    color: '#ffffff',
    padding: '14px 32px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600' as const,
    fontSize: '15px',
    display: 'inline-block',
    textAlign: 'center' as const,
  } as React.CSSProperties,
  infoCard: {
    backgroundColor: '#f0f7ff',
    border: '1px solid #dbeafe',
    borderRadius: '10px',
    padding: '20px 24px',
    margin: '20px 0',
  } as React.CSSProperties,
  successCard: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '10px',
    padding: '20px 24px',
    margin: '20px 0',
  } as React.CSSProperties,
  warningCard: {
    backgroundColor: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '10px',
    padding: '20px 24px',
    margin: '20px 0',
  } as React.CSSProperties,
  dangerCard: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '10px',
    padding: '20px 24px',
    margin: '20px 0',
  } as React.CSSProperties,
  detailRow: {
    display: 'flex' as const,
    justifyContent: 'space-between' as const,
    padding: '8px 0',
    borderBottom: `1px solid ${brand.border}`,
    fontSize: '14px',
  } as React.CSSProperties,
  detailLabel: {
    color: brand.textMuted,
    fontSize: '13px',
    margin: 0,
  } as React.CSSProperties,
  detailValue: {
    color: brand.text,
    fontWeight: '600' as const,
    fontSize: '14px',
    margin: 0,
    textAlign: 'right' as const,
  } as React.CSSProperties,
  amountLarge: {
    fontSize: '28px',
    fontWeight: '700' as const,
    color: brand.primary,
    margin: '4px 0',
  } as React.CSSProperties,
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  } as React.CSSProperties,
  hr: {
    borderColor: brand.divider,
    margin: '24px 0',
  } as React.CSSProperties,
  footer: {
    padding: '24px 40px 32px',
    textAlign: 'center' as const,
  } as React.CSSProperties,
  footerText: {
    fontSize: '12px',
    color: brand.textLight,
    lineHeight: '1.6',
    margin: '0 0 4px',
  } as React.CSSProperties,
  footerLink: {
    color: brand.primary,
    textDecoration: 'none',
    fontSize: '12px',
  } as React.CSSProperties,
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  } as React.CSSProperties,
  tableRow: {
    borderBottom: `1px solid ${brand.border}`,
  } as React.CSSProperties,
  tableCellLabel: {
    padding: '10px 0',
    color: brand.textMuted,
    fontSize: '13px',
    verticalAlign: 'top' as const,
    width: '40%',
  } as React.CSSProperties,
  tableCellValue: {
    padding: '10px 0',
    color: brand.text,
    fontWeight: '600' as const,
    fontSize: '14px',
    textAlign: 'right' as const,
    verticalAlign: 'top' as const,
  } as React.CSSProperties,
}

// ── Text Helpers ─────────────────────────────────────────

export function t(
  en: string,
  ar: string,
  locale: 'en' | 'ar',
): string {
  return locale === 'ar' ? ar : en
}

// ── Layout Component ─────────────────────────────────────

interface EmailLayoutProps {
  locale?: 'en' | 'ar'
  preview?: string
  children: React.ReactNode
}

export function EmailLayout({
  locale = 'en',
  preview,
  children,
}: EmailLayoutProps) {
  const isRtl = locale === 'ar'

  return (
    <Html lang={locale} dir={isRtl ? 'rtl' : 'ltr'}>
      <Head>
        {preview && <meta name="description" content={preview} />}
      </Head>
      <Body style={styles.body}>
        {/* Spacer */}
        <Section style={{ padding: '20px 16px' }}>
          <Container style={styles.outerContainer}>
            {/* ── Header ────────────────────────────── */}
            <Section style={styles.header}>
              <Img
                src="https://kzdikbfruedmoekcqppz.supabase.co/storage/v1/object/public/media/media/logo-light.png"
                alt={isRtl ? brand.nameAr : brand.name}
                width="160"
                style={{ margin: '0 auto', display: 'block' }}
              />
            </Section>

            {/* ── Content ───────────────────────────── */}
            <Section style={styles.content}>{children}</Section>

            {/* ── Footer ────────────────────────────── */}
            <Hr style={styles.hr} />
            <Section style={styles.footer}>
              <Text style={styles.footerText}>
                {isRtl
                  ? `${brand.nameAr} — ${brand.address}`
                  : `${brand.name} — ${brand.address}`}
              </Text>
              <Text style={styles.footerText}>
                <Link href={`mailto:${brand.email}`} style={styles.footerLink}>
                  {brand.email}
                </Link>
                {' · '}
                <Link href={`tel:${brand.phone.replace(/\s/g, '')}`} style={styles.footerLink}>
                  {brand.phone}
                </Link>
              </Text>
              <Text style={{ ...styles.footerText, marginTop: '12px' }}>
                <Link href={`https://${brand.domain}`} style={styles.footerLink}>
                  {brand.domain}
                </Link>
              </Text>
              <Text style={{ ...styles.footerText, marginTop: '16px', fontSize: '11px' }}>
                {isRtl
                  ? 'هذه الرسالة أُرسلت تلقائيًا. لا ترد على هذا البريد.'
                  : 'This is an automated message. Please do not reply to this email.'}
              </Text>
            </Section>
          </Container>
        </Section>
      </Body>
    </Html>
  )
}

// ── Reusable Detail Table ────────────────────────────────

interface DetailRowData {
  label: string
  value: string
  bold?: boolean
}

export function DetailTable({ rows }: { rows: DetailRowData[] }) {
  return (
    <table style={styles.table}>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={i < rows.length - 1 ? styles.tableRow : undefined}>
            <td style={styles.tableCellLabel}>{row.label}</td>
            <td
              style={{
                ...styles.tableCellValue,
                ...(row.bold ? { fontSize: '16px', color: brand.primary } : {}),
              }}
            >
              {row.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
