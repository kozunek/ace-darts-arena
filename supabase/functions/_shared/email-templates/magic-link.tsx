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

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="pl" dir="ltr">
    <Head />
    <Preview>Twój link do logowania – eDART Polska</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://uiolhzctnbskdjteufkj.supabase.co/storage/v1/object/public/avatars/email-logo.jpg"
          width="120"
          height="auto"
          alt="eDART Polska"
          style={{ marginBottom: '24px' }}
        />
        <Heading style={h1}>Link do logowania</Heading>
        <Text style={text}>
          Kliknij poniższy przycisk, aby zalogować się do eDART Polska. Link wygaśnie za kilka minut.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Zaloguj się
        </Button>
        <Text style={footer}>
          Jeśli nie prosiłeś o ten link, zignoruj tę wiadomość.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

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
