/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
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

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="pl" dir="ltr">
    <Head />
    <Preview>🔐 Twój kod weryfikacyjny – eDART Polska</Preview>
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
          <Heading style={h1}>Kod weryfikacyjny 🔐</Heading>
          <Text style={text}>
            Użyj poniższego kodu, aby potwierdzić swoją tożsamość:
          </Text>
          <Section style={codeBox}>
            <Text style={codeStyle}>{token}</Text>
          </Section>
          <Text style={smallText}>
            Kod wygaśnie za kilka minut. Nie udostępniaj go nikomu.
          </Text>
        </Section>
        <Hr style={divider} />
        <Section style={footerSection}>
          <Text style={footer}>
            Nie prosiłeś o ten kod? Zignoruj tę wiadomość i rozważ zmianę hasła.
          </Text>
          <Text style={footerBrand}>
            <Link href="https://edartpolska.pl" style={footerLink}>edartpolska.pl</Link> · Polska Liga Darta
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

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
const header = { backgroundColor: '#dc2626', padding: '24px 30px', textAlign: 'center' as const }
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
const text = { fontSize: '15px', color: '#8b919e', lineHeight: '1.7', margin: '0 0 24px' }
const smallText = { fontSize: '13px', color: '#6b7280', margin: '16px 0 0', textAlign: 'center' as const }
const codeBox = {
  backgroundColor: '#1e242e',
  border: '1px solid #262d38',
  borderRadius: '8px',
  padding: '20px',
  textAlign: 'center' as const,
  margin: '0 0 8px',
}
const codeStyle = {
  fontFamily: "'Courier New', Courier, monospace",
  fontSize: '36px',
  fontWeight: 'bold' as const,
  color: '#dc2626',
  margin: '0',
  letterSpacing: '8px',
}
const divider = { borderColor: '#262d38', margin: '0' }
const footerSection = { padding: '20px 30px' }
const footer = { fontSize: '12px', color: '#4b5563', margin: '0 0 8px', lineHeight: '1.5' }
const footerBrand = { fontSize: '11px', color: '#374151', margin: '0' }
const footerLink = { color: '#dc2626', textDecoration: 'none' }
