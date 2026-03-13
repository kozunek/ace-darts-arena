# 🎯 eDART Polska — Liga Darts Online

Platforma do zarządzania ligami darts z integracją [Autodarts](https://autodarts.io). Frontend React + Vite, backend Supabase (self-hosted lub cloud). Gotowa do deploy na **Vercel**.

---

## 🚀 Deploy na Vercel

### 1. Utwórz projekt Supabase

1. [supabase.com](https://supabase.com) → nowy projekt (lub [self-hosted](https://supabase.com/docs/guides/self-hosting))
2. Zapisz: **Project URL**, **Anon Key**, **Service Role Key**

### 2. Baza danych

Uruchom migracje z `supabase/migrations/` w SQL Editor (chronologicznie). Tworzą tabele, widoki, funkcje, triggery, RLS i kolejkę e-mail.

### 3. Edge Functions

Edge Functions działają w Supabase (Deno). Deploy via CLI:

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy --all
```

### 4. Sekrety Supabase (Edge Functions → Secrets)

| Sekret | Opis | Wymagany |
|--------|------|----------|
| `RESEND_API_KEY` | [resend.com](https://resend.com) — wysyłka e-maili | ✅ Dla e-maili |
| `AUTODARTS_EMAIL` | Email Autodarts (sync wyników) | Opcjonalny |
| `AUTODARTS_PASSWORD` | Hasło Autodarts | Opcjonalny |

### 5. AI — analiza screenshotów

W panelu admina → Integracje skonfiguruj:
- **OpenAI** (`sk-...`) → auto: `api.openai.com`, model `gpt-4o`
- **Gemini** (`AIza...`) → auto: Gemini API, model `gemini-2.5-pro`
- **Własny endpoint** → Ollama, vLLM, itp.

### 6. E-mail

1. [resend.com](https://resend.com) → dodaj domenę (np. `notify.twojadomena.pl`)
2. `RESEND_API_KEY` jako sekret Supabase
3. Panel admina → Integracje → E-mail: nazwa witryny + domeny
4. Opcjonalnie: Auth Hook w Supabase Dashboard → Authentication → Hooks → "Send Email" → URL Edge Function

### 7. Deploy frontend

```bash
vercel
```

Zmienne środowiskowe w Vercel:

| Zmienna | Wartość |
|---------|--------|
| `VITE_SUPABASE_URL` | `https://YOUR_PROJECT.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Twój Anon Key |
| `VITE_SUPABASE_PROJECT_ID` | ID projektu |

### 8. Storage Buckets

Supabase Dashboard → Storage: `avatars` (publiczny), `match-screenshots` (publiczny)

### 9. Pierwszy admin

```sql
INSERT INTO user_roles (user_id, role) VALUES ('UUID', 'admin');
```

### 10. Google OAuth (opcjonalny)

1. Google Cloud Console → OAuth 2.0 Client ID
2. Redirect: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
3. Supabase Dashboard → Auth → Providers → Google

### 11. Cron Jobs (pg_cron)

```sql
-- E-mail queue (co 5s)
SELECT cron.schedule('process-email-queue', '*/5 * * * *', $$...$$);
-- Cleanup czat (3:00)
SELECT cron.schedule('cleanup-group-chat', '0 3 * * *', $$...$$);
-- Cleanup storage (4:00)
SELECT cron.schedule('cleanup-storage', '0 4 * * *', $$...$$);
```

---

## 🏗️ Self-hosting VPS (Docker)

1. [Self-hosted Supabase](https://supabase.com/docs/guides/self-hosting/docker)
2. `npm run build` → serwuj `dist/` przez Nginx
3. Nginx: `try_files $uri $uri/ /index.html;`

---

## 📁 Struktura

```
src/                    # Frontend React
supabase/functions/     # Edge Functions (Deno) — AI, e-mail, Autodarts, Discord
supabase/migrations/    # Migracje SQL
public/chrome-extension # Wtyczka Chrome
public/firefox-extension # Wtyczka Firefox
vercel.json             # SPA routing dla Vercel
```

## 🔌 Integracje (Panel Admina)

| Integracja | Konfiguracja |
|-----------|-------------|
| Supabase | URL + Anon Key |
| AI (OCR) | API Key + Model + Endpoint |
| E-mail | Nazwa witryny + domeny nadawcy |
| Discord | Webhook URLs |
| Autodarts | Email + hasło (sekrety) |

## 🛡️ Bezpieczeństwo

- RLS na wszystkich tabelach
- Role przez `user_roles` (nie w profilu!)
- `SECURITY DEFINER` funkcje
- JWT weryfikacja w Edge Functions
