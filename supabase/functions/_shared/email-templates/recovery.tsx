/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
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
    <Preview>Resetowanie hasła – eDART Polska</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://uiolhzctnbskdjteufkj.supabase.co/storage/v1/object/public/avatars/email-logo.jpg"
          width="120"
          height="auto"
          alt="eDART Polska"
          style={{ marginBottom: '24px' }}
        />
        <Heading style={h1}>Resetowanie hasła</Heading>
        <Text style={text}>
          Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta w eDART Polska.
          Kliknij poniższy przycisk, aby ustawić nowe hasło.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Zresetuj hasło
        </Button>
        <Text style={footer}>
          Jeśli nie prosiłeś o zmianę hasła, zignoruj tę wiadomość. Twoje hasło pozostanie bez zmian.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

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
const button = {
  backgroundColor: '#dc2626',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '8px',
  padding: '12px 24px',
  textDecoration: 'none',
  fontWeight: 'bold' as const,
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
