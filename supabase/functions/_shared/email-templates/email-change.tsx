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
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="pl" dir="ltr">
    <Head />
    <Preview>Potwierdź zmianę adresu e-mail – eDART Polska</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://uiolhzctnbskdjteufkj.supabase.co/storage/v1/object/public/avatars/email-logo.jpg"
          width="120"
          height="auto"
          alt="eDART Polska"
          style={{ marginBottom: '24px' }}
        />
        <Heading style={h1}>Potwierdź zmianę e-maila</Heading>
        <Text style={text}>
          Poprosiłeś o zmianę adresu e-mail w eDART Polska z{' '}
          <Link href={`mailto:${email}`} style={link}>
            {email}
          </Link>{' '}
          na{' '}
          <Link href={`mailto:${newEmail}`} style={link}>
            {newEmail}
          </Link>
          .
        </Text>
        <Text style={text}>
          Kliknij poniższy przycisk, aby potwierdzić zmianę:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Potwierdź zmianę e-maila
        </Button>
        <Text style={footer}>
          Jeśli nie prosiłeś o tę zmianę, natychmiast zabezpiecz swoje konto.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

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
const link = { color: 'inherit', textDecoration: 'underline' }
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
