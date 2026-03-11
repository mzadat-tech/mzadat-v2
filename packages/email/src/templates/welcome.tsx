import * as React from 'react'
import { Html, Head, Body, Container, Text, Button, Hr } from '@react-email/components'

interface WelcomeEmailProps {
  firstName: string
  locale?: 'en' | 'ar'
}

export function WelcomeEmail({ firstName, locale = 'en' }: WelcomeEmailProps) {
  const isRtl = locale === 'ar'
  const title = isRtl ? `مرحباً ${firstName}!` : `Welcome ${firstName}!`
  const body = isRtl
    ? 'شكراً لتسجيلك في مزادات. نحن سعداء بانضمامك إلينا.'
    : 'Thank you for registering on Mzadat. We are happy to have you on board.'
  const cta = isRtl ? 'ابدأ الآن' : 'Get Started'

  return (
    <Html lang={locale} dir={isRtl ? 'rtl' : 'ltr'}>
      <Head />
      <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f4f4f5' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
          <Text style={{ fontSize: '24px', fontWeight: 'bold' }}>{title}</Text>
          <Text style={{ fontSize: '16px', color: '#374151' }}>{body}</Text>
          <Hr />
          <Button
            href={'https://mzadat.om'}
            style={{
              backgroundColor: '#2563eb',
              color: '#ffffff',
              padding: '12px 24px',
              borderRadius: '6px',
              textDecoration: 'none',
            }}
          >
            {cta}
          </Button>
        </Container>
      </Body>
    </Html>
  )
}

export default WelcomeEmail
