/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="pl" dir="ltr">
    <Head />
    <Preview>Twój kod weryfikacyjny – eDART Polska</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://uiolhzctnbskdjteufkj.supabase.co/storage/v1/object/public/avatars/email-logo.jpg"
          width="120"
          height="auto"
          alt="eDART Polska"
          style={{ marginBottom: '24px' }}
        />
        <Heading style={h1}>Kod weryfikacyjny</Heading>
        <Text style={text}>Użyj poniższego kodu, aby potwierdzić swoją tożsamość:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          Kod wygaśnie za kilka minut. Jeśli nie prosiłeś o ten kod, zignoruj tę wiadomość.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '30px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#0f1318',
  margin: '0 0 20px',
  fontFamily: "'Oswald', Arial, sans-serif",
}
const text = {
  fontSize: '14px',
  color: '#7a7f8a',
  lineHeight: '1.6',
  margin: '0 0 25px',
}
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#dc2626',
  margin: '0 0 30px',
  letterSpacing: '4px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
