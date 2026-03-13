import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const EMAIL_SUBJECTS: Record<string, string> = {
  signup: 'Potwierdź swój e-mail – eDART Polska',
  invite: 'Zaproszenie do eDART Polska',
  magiclink: 'Link do logowania – eDART Polska',
  recovery: 'Resetowanie hasła – eDART Polska',
  email_change: 'Potwierdź zmianę e-maila – eDART Polska',
  reauthentication: 'Twój kod weryfikacyjny – eDART Polska',
}

const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
}

// Default configuration (overridden by app_config table values)
let SITE_NAME = "eDART Polska"
let SENDER_DOMAIN = "notify.edartpolska.pl"
let ROOT_DOMAIN = "edartpolska.pl"
let FROM_DOMAIN = "edartpolska.pl"

async function loadEmailConfig() {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  const { data } = await supabase
    .from('app_config')
    .select('key, value')
    .in('key', ['email_site_name', 'email_sender_domain', 'email_from_domain', 'email_root_domain'])

  if (data) {
    for (const row of data) {
      if (row.key === 'email_site_name' && row.value) SITE_NAME = row.value
      if (row.key === 'email_sender_domain' && row.value) SENDER_DOMAIN = row.value
      if (row.key === 'email_from_domain' && row.value) FROM_DOMAIN = row.value
      if (row.key === 'email_root_domain' && row.value) ROOT_DOMAIN = row.value
    }
  }
}

// Sample data for preview mode ONLY
const SAMPLE_PROJECT_URL = "https://edartpolska.pl"
const SAMPLE_EMAIL = "user@example.test"
const SAMPLE_DATA: Record<string, object> = {
  signup: { siteName: SITE_NAME, siteUrl: SAMPLE_PROJECT_URL, recipient: SAMPLE_EMAIL, confirmationUrl: SAMPLE_PROJECT_URL },
  magiclink: { siteName: SITE_NAME, confirmationUrl: SAMPLE_PROJECT_URL },
  recovery: { siteName: SITE_NAME, confirmationUrl: SAMPLE_PROJECT_URL },
  invite: { siteName: SITE_NAME, siteUrl: SAMPLE_PROJECT_URL, confirmationUrl: SAMPLE_PROJECT_URL },
  email_change: { siteName: SITE_NAME, email: SAMPLE_EMAIL, newEmail: SAMPLE_EMAIL, confirmationUrl: SAMPLE_PROJECT_URL },
  reauthentication: { token: '123456' },
}

async function handlePreview(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Authenticate with WEBHOOK_SECRET or service_role key
  const authHeader = req.headers.get('Authorization')
  const webhookSecret = Deno.env.get('WEBHOOK_SECRET') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!webhookSecret || authHeader !== `Bearer ${webhookSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let type: string
  try {
    const body = await req.json()
    type = body.type
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const EmailTemplate = EMAIL_TEMPLATES[type]
  if (!EmailTemplate) {
    return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const sampleData = SAMPLE_DATA[type] || {}
  const html = await renderAsync(React.createElement(EmailTemplate, sampleData))
  return new Response(html, {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  })
}

/**
 * Webhook handler — called by Supabase Auth Hook.
 * 
 * For self-hosted Supabase, configure this as an Auth Hook:
 *   1. Go to Supabase Dashboard → Authentication → Hooks
 *   2. Add "Send Email" hook pointing to this Edge Function URL
 *   3. Set WEBHOOK_SECRET as a Supabase secret (used for HMAC verification)
 * 
 * Payload format (from Supabase Auth Hook):
 * {
 *   "user": { "email": "..." },
 *   "email_data": {
 *     "token": "...",
 *     "token_hash": "...",
 *     "redirect_to": "...",
 *     "email_action_type": "signup|recovery|magiclink|invite|email_change|reauthentication",
 *     "site_url": "..."
 *   }
 * }
 */
async function handleWebhook(req: Request): Promise<Response> {
  await loadEmailConfig()

  let payload: any
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Support both Lovable webhook format and standard Supabase Auth Hook format
  let emailType: string
  let email: string
  let confirmationUrl: string
  let token: string | undefined
  let newEmail: string | undefined

  if (payload.data?.action_type) {
    // Lovable-style webhook payload
    emailType = payload.data.action_type
    email = payload.data.email
    confirmationUrl = payload.data.url
    token = payload.data.token
    newEmail = payload.data.new_email
  } else if (payload.email_data?.email_action_type) {
    // Standard Supabase Auth Hook payload
    emailType = payload.email_data.email_action_type
    email = payload.user?.email || ''
    token = payload.email_data.token
    newEmail = payload.email_data.new_email

    // Build confirmation URL from token_hash
    const siteUrl = payload.email_data.site_url || `https://${ROOT_DOMAIN}`
    const tokenHash = payload.email_data.token_hash || ''
    const redirectTo = payload.email_data.redirect_to || siteUrl

    if (emailType === 'signup' || emailType === 'invite') {
      confirmationUrl = `${siteUrl}/auth/v1/verify?token=${tokenHash}&type=${emailType}&redirect_to=${encodeURIComponent(redirectTo)}`
    } else if (emailType === 'recovery') {
      confirmationUrl = `${siteUrl}/auth/v1/verify?token=${tokenHash}&type=recovery&redirect_to=${encodeURIComponent(redirectTo)}`
    } else if (emailType === 'magiclink') {
      confirmationUrl = `${siteUrl}/auth/v1/verify?token=${tokenHash}&type=magiclink&redirect_to=${encodeURIComponent(redirectTo)}`
    } else if (emailType === 'email_change') {
      confirmationUrl = `${siteUrl}/auth/v1/verify?token=${tokenHash}&type=email_change&redirect_to=${encodeURIComponent(redirectTo)}`
    } else {
      confirmationUrl = siteUrl
    }
  } else {
    return new Response(JSON.stringify({ error: 'Unknown payload format' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  console.log('Received auth event', { emailType, email })

  const EmailTemplate = EMAIL_TEMPLATES[emailType]
  if (!EmailTemplate) {
    return new Response(JSON.stringify({ error: `Unknown email type: ${emailType}` }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const templateProps = {
    siteName: SITE_NAME,
    siteUrl: `https://${ROOT_DOMAIN}`,
    recipient: email,
    confirmationUrl,
    token,
    email,
    newEmail,
  }

  const html = await renderAsync(React.createElement(EmailTemplate, templateProps))
  const text = await renderAsync(React.createElement(EmailTemplate, templateProps), { plainText: true })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const messageId = crypto.randomUUID()

  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: emailType,
    recipient_email: email,
    status: 'pending',
  })

  const { error: enqueueError } = await supabase.rpc('enqueue_email', {
    queue_name: 'auth_emails',
    payload: {
      message_id: messageId,
      to: email,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject: EMAIL_SUBJECTS[emailType] || 'Notification',
      html,
      text,
      purpose: 'transactional',
      label: emailType,
      queued_at: new Date().toISOString(),
    },
  })

  if (enqueueError) {
    console.error('Failed to enqueue auth email', { error: enqueueError, emailType })
    return new Response(JSON.stringify({ error: 'Failed to enqueue email' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  console.log('Auth email enqueued', { emailType, email })
  return new Response(
    JSON.stringify({ success: true, queued: true }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

Deno.serve(async (req) => {
  const url = new URL(req.url)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (url.pathname.endsWith('/preview')) {
    return handlePreview(req)
  }

  try {
    return await handleWebhook(req)
  } catch (error) {
    console.error('Webhook handler error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
