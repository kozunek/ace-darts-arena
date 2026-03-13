/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="pl" dir="ltr">
    <Head />
    <Preview>🔑 Resetowanie hasła – eDART Polska</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={header}>
          <Img
            src="https://uiolhzctnbskdjteufkj.supabase.co/storage/v1/object/public/avatars/email-logo.jpg"
            width="80"
            height="auto"
            alt="eDART Polska"
            style={logo}
          />
        </Section>
        <Section style={content}>
          <Heading style={h1}>Resetowanie hasła 🔑</Heading>
          <Text style={text}>
            Ktoś poprosił o zresetowanie hasła do Twojego konta w <strong>eDART Polska</strong>. 
            Kliknij przycisk poniżej, aby ustawić nowe hasło.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={confirmationUrl}>
              Ustaw nowe hasło
            </Button>
          </Section>
          <Text style={smallText}>
            Link wygaśnie za kilka minut.
          </Text>
        </Section>
        <Hr style={divider} />
        <Section style={footerSection}>
          <Text style={footer}>
            Nie prosiłeś o zmianę hasła? Zignoruj tę wiadomość — Twoje hasło pozostanie bez zmian.
          </Text>
          <Text style={footerBrand}>
            <Link href="https://edartpolska.pl" style={footerLink}>edartpolska.pl</Link> · Polska Liga Darta
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = {
  backgroundColor: '#0f1318',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
  padding: '40px 0',
}
const wrapper = {
  backgroundColor: '#181d25',
  borderRadius: '12px',
  border: '1px solid #262d38',
  maxWidth: '480px',
  margin: '0 auto',
  overflow: 'hidden' as const,
}
const header = {
  backgroundColor: '#dc2626',
  padding: '24px 30px',
  textAlign: 'center' as const,
}
const logo = { borderRadius: '8px' }
const content = { padding: '32px 30px 24px' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#ece8e1',
  margin: '0 0 16px',
  fontFamily: "'Oswald', Arial, sans-serif",
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
}
const text = {
  fontSize: '15px',
  color: '#8b919e',
  lineHeight: '1.7',
  margin: '0 0 24px',
}
const smallText = { fontSize: '13px', color: '#6b7280', margin: '16px 0 0' }
const buttonContainer = { textAlign: 'center' as const, margin: '8px 0' }
const button = {
  backgroundColor: '#dc2626',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '8px',
  padding: '14px 32px',
  textDecoration: 'none',
  fontWeight: 'bold' as const,
  fontFamily: "'Oswald', Arial, sans-serif",
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  display: 'inline-block' as const,
}
const divider = { borderColor: '#262d38', margin: '0' }
const footerSection = { padding: '20px 30px' }
const footer = { fontSize: '12px', color: '#4b5563', margin: '0 0 8px', lineHeight: '1.5' }
const footerBrand = { fontSize: '11px', color: '#374151', margin: '0' }
const footerLink = { color: '#dc2626', textDecoration: 'none' }
