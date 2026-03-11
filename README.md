# 🎯 eDART Polska — Liga Darts Online

Platforma do zarządzania ligami darts z integracją [Autodarts](https://autodarts.io). Automatyczne pobieranie statystyk, śledzenie wyników na żywo, tabele ligowe, turnieje i więcej.

**Strona:** [https://ace-darts-arena.lovable.app](https://ace-darts-arena.lovable.app)

---

## 📋 Spis treści

1. [Funkcjonalności](#-funkcjonalności)
2. [Architektura](#-architektura)
3. [Wymagania](#-wymagania)
4. [Self-hosting na VPS — kompletny poradnik](#-self-hosting-na-vps--kompletny-poradnik)
5. [Baza danych — schemat](#-baza-danych--schemat)
6. [Edge Functions](#-edge-functions)
7. [Analiza screenshotów AI (bez Lovable)](#-analiza-screenshotów-ai-bez-lovable)
8. [Wtyczka przeglądarki](#-wtyczka-przeglądarki)
9. [Konfiguracja Autodarts](#-konfiguracja-autodarts)
10. [Panel admina](#-panel-admina)
11. [Zmienne środowiskowe](#-zmienne-środowiskowe)
12. [Automatyczne czyszczenie Storage](#-automatyczne-czyszczenie-storage)
13. [Deployment](#-deployment)

---

## 🚀 Funkcjonalności

- **Liga i turnieje** — tworzenie lig (round-robin, puchar), automatyczne generowanie meczy, tabele punktowe z regułami bonusowymi
- **Integracja Autodarts** — automatyczne pobieranie statystyk z API Autodarts (średnia, 180-tki, checkouty, zakresy tonów, etc.)
- **Analiza screenshotów AI** — gracze DartCounter/DartsMind przesyłają zrzuty ekranu, AI (Gemini Vision) automatycznie odczytuje statystyki, dopasowuje graczy i uzupełnia formularz
- **Wtyczka Chrome/Firefox** — przechwytuje token Autodarts, wykrywa mecze ligowe, automatycznie wysyła wyniki po zakończeniu meczu
- **Mecze na żywo** — śledzenie wyników w czasie rzeczywistym (Supabase Realtime)
- **Czat między graczami** — wiadomości z opcją ustalania terminów
- **Propozycje terminów** — gracze mogą proponować i akceptować daty meczów
- **System powiadomień** — powiadomienia o nowych meczach, propozycjach terminów, wynikach
- **Statystyki i osiągnięcia** — szczegółowe statystyki graczy, Hall of Fame, Head-to-Head
- **Ujednolicone statystyki** — te same statystyki (średnia, first 9, 180s, checkout, ton ranges, lotki) dla wszystkich platform
- **System ról** — admin, moderator, user z RLS (Row Level Security)
- **PWA** — aplikacja dostępna jako Progressive Web App
- **APK** — wersja Android (WebView wrapper)
- **Automatyczne czyszczenie Storage** — codzienne kasowanie nieużywanych screenshotów (>30 dni) i osieroconych awatarów

---

## 🏗 Architektura

```
┌─────────────────┐     ┌──────────────────────┐
│  React Frontend │────▶│  Supabase (Backend)   │
│  (Vite + TS)    │     │  ├── PostgreSQL       │
│                 │     │  ├── Auth             │
│                 │     │  ├── Edge Functions   │
│                 │     │  ├── Storage          │
│                 │     │  └── Realtime         │
└─────────────────┘     └──────────────────────┘
         ▲                        ▲
         │                        │
┌─────────────────┐     ┌──────────────────────┐
│ Wtyczka Chrome/ │────▶│  Autodarts API       │
│ Firefox         │     │  (api.autodarts.io)  │
└─────────────────┘     └──────────────────────┘
                                  ▲
                                  │
                        ┌──────────────────────┐
                        │  AI API (Gemini /     │
                        │  OpenAI / dowolne)    │
                        └──────────────────────┘
```

**Stack technologiczny:**
- Frontend: React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion
- Backend: Supabase (PostgreSQL + Auth + Edge Functions + Realtime + Storage)
- AI: Lovable AI Gateway (Google Gemini 2.5 Flash) — analiza screenshotów — **lub dowolne API kompatybilne z OpenAI**
- Integracja: Autodarts API (REST + OIDC), DartCounter (OCR), DartsMind (OCR), wtyczki Chrome/Firefox
- Auth: Email/hasło + Google OAuth

---

## 📦 Wymagania

### Dla Lovable Cloud (najłatwiejsze)
- Konto [Lovable](https://lovable.dev) — backend automatycznie skonfigurowany

### Dla Self-hosting na VPS
- **VPS** z Ubuntu 22.04+ (min. 2 GB RAM, 20 GB dysk)
- **Docker** + **Docker Compose** — do uruchomienia Supabase
- **Node.js** ≥ 18 (lub Bun) — do budowania frontendu
- **Deno** ≥ 1.30 — do uruchomienia Edge Functions (lub Supabase CLI)
- **Nginx** — reverse proxy + SSL
- **Certbot** — darmowy certyfikat SSL (Let's Encrypt)
- **Domena** — z dostępem do DNS (A record → IP VPS)
- **(Opcjonalne)** Klucz API do AI (Google Gemini, OpenAI, lub inny)
- **(Opcjonalne)** Konto Autodarts + credentials API

---

## 🖥 Self-hosting na VPS — kompletny poradnik

### Krok 1: Przygotowanie VPS

```bash
# Aktualizacja systemu
sudo apt update && sudo apt upgrade -y

# Instalacja wymaganych pakietów
sudo apt install -y git curl wget nginx certbot python3-certbot-nginx

# Instalacja Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Instalacja Docker Compose
sudo apt install -y docker-compose-plugin

# Instalacja Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalacja Supabase CLI
npm install -g supabase

# Instalacja Deno (do Edge Functions)
curl -fsSL https://deno.land/install.sh | sh
echo 'export DENO_INSTALL="$HOME/.deno"' >> ~/.bashrc
echo 'export PATH="$DENO_INSTALL/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### Krok 2: Self-hosted Supabase (baza danych + auth + storage)

```bash
# Sklonuj Supabase Docker
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker

# Skopiuj przykładową konfigurację
cp .env.example .env
```

**Edytuj plik `.env`** — zmień te wartości:

```env
# KRYTYCZNE — zmień na unikalne wartości!
POSTGRES_PASSWORD=twoje-bezpieczne-haslo-db
JWT_SECRET=twoj-super-tajny-jwt-secret-min-32-znaki
ANON_KEY=wygeneruj-przez-supabase-cli
SERVICE_ROLE_KEY=wygeneruj-przez-supabase-cli

# Generowanie kluczy JWT:
# supabase gen keys --jwt-secret "twoj-super-tajny-jwt-secret-min-32-znaki"
# To wyświetli ANON_KEY i SERVICE_ROLE_KEY

# Domena
SITE_URL=https://twoja-domena.pl
API_EXTERNAL_URL=https://api.twoja-domena.pl

# SMTP (do wysyłania emaili z Auth)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=twoj-email@gmail.com
SMTP_PASS=haslo-aplikacji-gmail
SMTP_SENDER_NAME=eDART Polska
SMTP_ADMIN_EMAIL=admin@twoja-domena.pl

# Storage
STORAGE_BACKEND=file
FILE_STORAGE_BACKEND_PATH=/var/lib/storage
```

**Generowanie kluczy JWT:**

```bash
# Zainstaluj narzędzie do generowania kluczy
npm install -g jsonwebtoken

# Lub użyj strony: https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys
# Wklej swój JWT_SECRET i wygeneruj ANON_KEY i SERVICE_ROLE_KEY
```

**Uruchom Supabase:**

```bash
docker compose up -d

# Sprawdź czy działa
docker compose ps
# Wszystkie kontenery powinny mieć status "running"

# Supabase Studio (panel admina DB) będzie na porcie 3000
# API będzie na porcie 8000
```

### Krok 3: Konfiguracja bazy danych

```bash
# Wróć do katalogu projektu eDART
cd ~/edart-polska

# Połącz Supabase CLI z lokalną instancją
supabase link --project-ref local \
  --db-url "postgresql://postgres:twoje-bezpieczne-haslo-db@localhost:5432/postgres"

# Uruchom wszystkie migracje
supabase db push

# Lub ręcznie przez psql:
# PGPASSWORD=twoje-haslo psql -h localhost -p 5432 -U postgres -d postgres -f supabase/migrations/*.sql
```

**Weryfikacja — po migracji powinny istnieć tabele:**

```bash
# Sprawdź tabele
PGPASSWORD=twoje-haslo psql -h localhost -p 5432 -U postgres -d postgres -c "\dt public.*"

# Oczekiwane tabele:
# players, profiles, user_roles, leagues, player_leagues, matches,
# match_proposals, match_reactions, match_audit_log, live_matches,
# notifications, announcements, chat_messages, extension_settings, bug_reports
```

### Krok 4: Konfiguracja Storage (buckety)

```sql
-- Uruchom w Supabase Studio (localhost:3000) → SQL Editor
-- lub przez psql:

-- Utwórz buckety storage
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('match-screenshots', 'match-screenshots', true);

-- Polityki storage — avatary
CREATE POLICY "Avatars publiczne" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Upload avatarów" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND auth.role() = 'authenticated'
);
CREATE POLICY "Aktualizacja avatarów" ON storage.objects FOR UPDATE USING (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Polityki storage — screenshoty
CREATE POLICY "Screenshoty publiczne" ON storage.objects FOR SELECT USING (bucket_id = 'match-screenshots');
CREATE POLICY "Upload screenshotów" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'match-screenshots' AND auth.role() = 'authenticated'
);
```

### Krok 5: Edge Functions (backend logic)

Edge Functions to serverless funkcje Deno. Na self-hosted Supabase masz dwa sposoby:

#### Opcja A: Supabase Edge Runtime (rekomendowane)

```bash
# Edge Functions działają automatycznie z docker compose
# Pliki z supabase/functions/ są montowane do kontenera

# Ustaw sekrety Edge Functions
docker compose exec supabase-edge-functions sh -c '
  echo "SUPABASE_URL=http://kong:8000" >> /etc/environment
  echo "SUPABASE_ANON_KEY=twoj-anon-key" >> /etc/environment
  echo "SUPABASE_SERVICE_ROLE_KEY=twoj-service-role-key" >> /etc/environment
  echo "AUTODARTS_EMAIL=twoj@email.com" >> /etc/environment
  echo "AUTODARTS_PASSWORD=twoje-haslo" >> /etc/environment
'

# Lub przez supabase CLI:
supabase functions deploy fetch-autodarts-match --no-verify-jwt
supabase functions deploy submit-match-result
supabase functions deploy auto-submit-league-match --no-verify-jwt
supabase functions deploy check-league-match --no-verify-jwt
supabase functions deploy analyze-match-screenshot
supabase functions deploy cleanup-storage --no-verify-jwt
```

#### Opcja B: Standalone Deno server (alternatywa)

Jeśli nie chcesz używać Supabase Edge Runtime, możesz uruchomić Edge Functions jako standalone serwer Deno:

```bash
# Utwórz plik serwera
cat > ~/edart-edge-server.ts << 'EOF'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Załaduj zmienne środowiskowe
const FUNCTIONS_DIR = "./supabase/functions";

serve(async (req: Request) => {
  const url = new URL(req.url);
  const functionName = url.pathname.split("/")[2]; // /functions/v1/FUNCTION_NAME
  
  // Dynamicznie importuj i wywołaj odpowiednią funkcję
  try {
    const mod = await import(`${FUNCTIONS_DIR}/${functionName}/index.ts`);
    return mod.default(req);
  } catch (e) {
    return new Response(JSON.stringify({ error: "Function not found" }), { status: 404 });
  }
}, { port: 8001 });
EOF

# Uruchom z odpowiednimi zmiennymi
SUPABASE_URL=http://localhost:8000 \
SUPABASE_ANON_KEY=twoj-anon-key \
SUPABASE_SERVICE_ROLE_KEY=twoj-service-role-key \
AUTODARTS_EMAIL=twoj@email.com \
AUTODARTS_PASSWORD=twoje-haslo \
deno run --allow-net --allow-env --allow-read ~/edart-edge-server.ts
```

### Krok 6: AI — analiza screenshotów (bez Lovable AI Gateway)

Na Lovable Cloud funkcja `analyze-match-screenshot` używa `LOVABLE_API_KEY` i Lovable AI Gateway. Na własnym serwerze musisz podłączyć własne API AI.

#### Opcja A: Google Gemini API (rekomendowane — najtańsze)

1. **Uzyskaj klucz API:**
   - Wejdź na [Google AI Studio](https://aistudio.google.com/)
   - Kliknij "Get API Key" → "Create API Key"
   - Skopiuj klucz (zaczyna się od `AIza...`)

2. **Ustaw sekret:**

```bash
supabase secrets set GEMINI_API_KEY="AIzaSy..."
```

3. **Zmodyfikuj Edge Function** — zamień Lovable AI Gateway na bezpośrednie API Gemini:

```typescript
// supabase/functions/analyze-match-screenshot/index.ts
// Zmień linię z AI_GATEWAY i fetch na:

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
if (!GEMINI_API_KEY) {
  return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), {
    status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Zamień fetch do AI Gateway na:
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: systemPrompt + "\n\n" + userText },
            ...screenshot_urls.map((url: string) => ({
              inline_data: {
                mime_type: "image/png",
                // Uwaga: dla URL musisz najpierw pobrać obraz i konwertować na base64
                // lub użyć fileUri z Google Cloud Storage
              }
            }))
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
      }
    }),
  }
);
```

**Prostsza opcja — zachowaj format OpenAI-compatible (np. OpenRouter):**

```typescript
// Zamiast Lovable AI Gateway, użyj OpenRouter, Together AI, lub innego proxy
const AI_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const AI_API_KEY = Deno.env.get("OPENROUTER_API_KEY"); // lub TOGETHER_API_KEY, etc.

const response = await fetch(AI_API_URL, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${AI_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "google/gemini-2.5-flash",  // lub inny model z wizją
    messages: [...],
    tools: [...],
    tool_choice: {...},
  }),
});
```

#### Opcja B: OpenAI API

```bash
supabase secrets set OPENAI_API_KEY="sk-..."
```

```typescript
// Zamień AI_GATEWAY i LOVABLE_API_KEY na:
const AI_API_URL = "https://api.openai.com/v1/chat/completions";
const AI_API_KEY = Deno.env.get("OPENAI_API_KEY");

// Reszta kodu (messages, tools, tool_choice) jest identyczna!
// Zmień tylko model na "gpt-4o" lub "gpt-4o-mini"
```

#### Opcja C: Self-hosted AI (Ollama)

```bash
# Na VPS zainstaluj Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pobierz model z wizją (wymaga min 8 GB RAM)
ollama pull llava:13b
# lub mniejszy:
ollama pull llava:7b
```

```typescript
// Edge Function — użyj lokalnego Ollama
const AI_API_URL = "http://localhost:11434/v1/chat/completions";
// Ollama jest kompatybilny z OpenAI API, więc reszta kodu zostaje bez zmian
// Model: "llava:13b"
// UWAGA: Ollama nie wspiera tool_choice, więc musisz parsować JSON z odpowiedzi tekstowej
```

#### Porównanie kosztów AI:

| Provider | Model | Koszt / mecz (1-3 screenshoty) | Jakość OCR |
|----------|-------|-------------------------------|------------|
| Google Gemini | gemini-2.5-flash | ~$0.001-0.003 | ⭐⭐⭐⭐⭐ |
| OpenAI | gpt-4o-mini | ~$0.002-0.005 | ⭐⭐⭐⭐ |
| OpenAI | gpt-4o | ~$0.01-0.03 | ⭐⭐⭐⭐⭐ |
| OpenRouter | gemini-2.5-flash | ~$0.001-0.003 | ⭐⭐⭐⭐⭐ |
| Ollama (self-hosted) | llava:13b | $0 (prąd) | ⭐⭐⭐ |
| Lovable AI Gateway | gemini-2.5-flash | wliczone w plan | ⭐⭐⭐⭐⭐ |

### Krok 7: Budowanie i deploy frontendu

```bash
cd ~/edart-polska

# Utwórz plik .env
cat > .env << EOF
VITE_SUPABASE_PROJECT_ID="local"
VITE_SUPABASE_PUBLISHABLE_KEY="twoj-anon-key"
VITE_SUPABASE_URL="https://api.twoja-domena.pl"
EOF

# Zbuduj aplikację
npm install
npm run build

# Skopiuj pliki do nginx
sudo mkdir -p /var/www/edart
sudo cp -r dist/* /var/www/edart/
```

### Krok 8: Konfiguracja Nginx + SSL

```bash
# Utwórz konfigurację nginx
sudo cat > /etc/nginx/sites-available/edart << 'EOF'
# Frontend — główna domena
server {
    listen 80;
    server_name twoja-domena.pl www.twoja-domena.pl;

    root /var/www/edart;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache statycznych plików
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
}

# Supabase API — subdomena
server {
    listen 80;
    server_name api.twoja-domena.pl;

    # Proxy do Supabase Kong API Gateway
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support (Realtime)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

# Supabase Studio (opcjonalne — panel admina DB)
server {
    listen 80;
    server_name studio.twoja-domena.pl;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;

        # WAŻNE: Ogranicz dostęp!
        allow TWOJE_IP;
        deny all;
    }
}
EOF

# Aktywuj konfigurację
sudo ln -s /etc/nginx/sites-available/edart /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL — certyfikat Let's Encrypt
sudo certbot --nginx -d twoja-domena.pl -d www.twoja-domena.pl -d api.twoja-domena.pl

# Auto-renewal
sudo systemctl enable certbot.timer
```

### Krok 9: Konfiguracja DNS

W panelu swojego rejestratora domen dodaj rekordy:

| Typ | Nazwa | Wartość | TTL |
|-----|-------|---------|-----|
| A | @ | IP_TWOJEGO_VPS | 300 |
| A | www | IP_TWOJEGO_VPS | 300 |
| A | api | IP_TWOJEGO_VPS | 300 |
| A | studio | IP_TWOJEGO_VPS | 300 |

### Krok 10: Konto admina

```bash
# Zarejestruj się przez formularz na stronie

# Nadaj rolę admina w bazie
PGPASSWORD=twoje-haslo psql -h localhost -p 5432 -U postgres -d postgres << 'SQL'
-- Znajdź swoje user_id
SELECT id, email FROM auth.users;

-- Nadaj rolę admina
INSERT INTO public.user_roles (user_id, role) 
VALUES ('TWOJE_USER_ID', 'admin');
SQL
```

### Krok 11: Google OAuth (logowanie przez Google)

1. Wejdź na [Google Cloud Console](https://console.cloud.google.com/)
2. Utwórz nowy projekt (lub użyj istniejącego)
3. Idź do **APIs & Services → Credentials**
4. Kliknij **Create Credentials → OAuth 2.0 Client ID**
5. Typ: **Web application**
6. Authorized redirect URIs: `https://api.twoja-domena.pl/auth/v1/callback`
7. Skopiuj **Client ID** i **Client Secret**

**Konfiguracja w Supabase:**

```bash
# W Supabase Studio → Authentication → Providers → Google
# Lub przez API:
PGPASSWORD=twoje-haslo psql -h localhost -p 5432 -U postgres -d postgres << 'SQL'
UPDATE auth.config SET 
  external_google_enabled = true,
  external_google_client_id = 'TWOJ_GOOGLE_CLIENT_ID',
  external_google_secret = 'TWOJ_GOOGLE_CLIENT_SECRET'
WHERE id = 1;
SQL
```

**Ważne — zamień Lovable Auth na Supabase Auth w kodzie:**

```typescript
// src/pages/LoginPage.tsx — zmień handleGoogleSignIn:
// ZAMIEŃ:
// lovable.auth.signInWithOAuth("google")
// NA:
const { error } = await supabase.auth.signInWithOAuth({
  provider: "google",
  options: { redirectTo: window.location.origin },
});
```

### Krok 12: Automatyczne czyszczenie Storage

Projekt zawiera Edge Function `cleanup-storage`, która kasuje:
- Screenshoty z `match-screenshots` starsze niż 30 dni i niepowiązane z żadnym meczem
- Osierocone awatary z `avatars` niepowiązane z żadnym graczem

**Konfiguracja cron job (codziennie o 3:00):**

```bash
# Dodaj do crontab
crontab -e

# Dodaj linię:
0 3 * * * curl -s -X POST "https://api.twoja-domena.pl/functions/v1/cleanup-storage" \
  -H "Authorization: Bearer TWOJ_ANON_KEY" \
  -H "Content-Type: application/json" >> /var/log/edart-cleanup.log 2>&1
```

Lub przez pg_cron w PostgreSQL:

```sql
-- Włącz pg_cron (jeśli nie włączony)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Zaplanuj czyszczenie codziennie o 3:00
SELECT cron.schedule(
  'cleanup-storage-daily',
  '0 3 * * *',
  $$SELECT net.http_post(
    url := 'https://api.twoja-domena.pl/functions/v1/cleanup-storage',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer TWOJ_ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  )$$
);
```

### Krok 13: Monitoring i backup

```bash
# Backup bazy danych (codziennie)
crontab -e
# Dodaj:
0 2 * * * PGPASSWORD=twoje-haslo pg_dump -h localhost -p 5432 -U postgres postgres | gzip > /var/backups/edart-$(date +\%Y\%m\%d).sql.gz

# Monitorowanie logów
docker compose logs -f --tail=100

# Sprawdzenie zdrowia kontenerów
docker compose ps

# Restart po awarii
docker compose restart
```

### Krok 14: Firewall

```bash
# Otwórz wymagane porty
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# NIE otwieraj portów Supabase (8000, 3000, 5432) — dostęp tylko przez nginx!
```

---

## 🗄 Baza danych — schemat

### Tabele

| Tabela | Opis |
|--------|------|
| `players` | Gracze — imię, avatar, autodarts_user_id, telefon, discord |
| `profiles` | Profile użytkowników (auto-tworzone przy rejestracji) |
| `user_roles` | Role użytkowników (admin, moderator, user) |
| `leagues` | Ligi/turnieje — format, reguły bonusowe, sezon |
| `player_leagues` | Przypisanie graczy do lig |
| `matches` | Mecze — wyniki, statystyki, status |
| `match_proposals` | Propozycje terminów meczów |
| `match_reactions` | Reakcje emoji na mecze |
| `match_audit_log` | Log zmian w meczach |
| `live_matches` | Mecze na żywo (Realtime) |
| `notifications` | Powiadomienia dla użytkowników |
| `announcements` | Ogłoszenia administracyjne |
| `chat_messages` | Wiadomości czatu |
| `extension_settings` | Ustawienia wtyczki Chrome/Firefox |
| `bug_reports` | Zgłoszenia błędów |

### Kluczowe funkcje bazy danych

```sql
-- Sprawdzanie roli użytkownika (unika rekurencji RLS)
has_role(_user_id UUID, _role app_role) → boolean

-- Sprawdzanie czy user jest moderatorem lub adminem
is_moderator_or_admin(_user_id UUID) → boolean

-- Pobieranie kontaktu do przeciwnika (tylko dla graczy z zaplanowanym meczem)
get_opponent_contact(opponent_player_id UUID) → TABLE(phone, discord)

-- Pobieranie publicznych informacji o graczu
get_player_public_info(p_id UUID) → TABLE(id, name, avatar, avatar_url, approved)
```

### Triggery

```sql
-- Auto-tworzenie profilu i gracza przy rejestracji
handle_new_user() → trigger on auth.users

-- Powiadomienie o przypisaniu meczu
notify_match_assigned() → trigger on matches INSERT

-- Powiadomienie o propozycji terminu
notify_match_proposal() → trigger on match_proposals INSERT

-- Powiadomienie o zaakceptowaniu propozycji
notify_proposal_accepted() → trigger on match_proposals UPDATE
```

### RLS (Row Level Security)

Wszystkie tabele mają włączone RLS. Kluczowe zasady:

- **players** — odczyt dla wszystkich (w tym anonimowych), edycja własnego profilu, pełne zarządzanie przez admina
- **matches** — odczyt dla wszystkich, zgłaszanie wyników przez uczestników meczu (`upcoming` → `pending_approval`), zarządzanie przez admina/moderatora
- **chat_messages** — odczyt/zapis tylko dla uczestników konwersacji
- **notifications** — odczyt/aktualizacja tylko własnych powiadomień
- **user_roles** — odczyt własnych ról, zarządzanie przez admina

---

## ⚡ Edge Functions

### 1. `check-league-match`

**Cel:** Sprawdza czy mecz na Autodarts to mecz ligowy w eDART.

**Endpoint:** `POST /functions/v1/check-league-match`  
**Auth:** Publiczny (`verify_jwt = false`)

**Request:**
```json
{
  "player1_name": "Jan Kowalski",
  "player2_name": "Anna Nowak",
  "player1_autodarts_id": "uuid-autodarts",
  "player2_autodarts_id": "uuid-autodarts"
}
```

### 2. `auto-submit-league-match`

**Cel:** Automatyczne zgłaszanie wyniku meczu ligowego (wywoływane przez wtyczkę).

**Endpoint:** `POST /functions/v1/auto-submit-league-match`  
**Auth:** Publiczny (`verify_jwt = false`) — autoryzacja przez anon key

### 3. `fetch-autodarts-match`

**Cel:** Pobieranie statystyk meczu z Autodarts API.

**Endpoint:** `POST /functions/v1/fetch-autodarts-match`  
**Auth:** Bearer token (zalogowany użytkownik)

### 4. `submit-match-result`

**Cel:** Ręczne zgłaszanie wyniku meczu.

**Endpoint:** `POST /functions/v1/submit-match-result`  
**Auth:** Bearer token (zalogowany użytkownik)

### 5. `analyze-match-screenshot` (AI Vision)

**Cel:** Automatyczne rozpoznawanie statystyk z zrzutów ekranu.

**Endpoint:** `POST /functions/v1/analyze-match-screenshot`  
**Auth:** Bearer token (zalogowany użytkownik)

Patrz sekcja [Analiza screenshotów AI](#-analiza-screenshotów-ai-bez-lovable) po szczegóły konfiguracji bez Lovable.

### 6. `cleanup-storage`

**Cel:** Automatyczne kasowanie nieużywanych plików z Storage.

**Endpoint:** `POST /functions/v1/cleanup-storage`  
**Auth:** Publiczny (`verify_jwt = false`)

**Co kasuje:**
- Pliki w `match-screenshots` starsze niż 30 dni i niepowiązane z żadnym meczem
- Pliki w `avatars` niepowiązane z żadnym graczem

---

## 🔌 Wtyczka przeglądarki

### Wersja: 1.5.0

Wtyczka dostępna dla **Chrome** (Manifest V3) i **Firefox** (Manifest V2).

### Konfiguracja wtyczki dla własnego serwera

W plikach `background.js` (Chrome i Firefox) zmień:

```javascript
const EDART_URL = "https://twoja-domena.pl";
const SUPABASE_URL = "https://api.twoja-domena.pl";
const SUPABASE_ANON_KEY = "twoj-anon-key";
```

W `manifest.json` zaktualizuj `host_permissions`:

```json
{
  "host_permissions": [
    "https://login.autodarts.io/*",
    "https://play.autodarts.io/*",
    "https://api.autodarts.io/*",
    "https://twoja-domena.pl/*",
    "https://api.twoja-domena.pl/*"
  ]
}
```

### Instalacja wtyczki (Chrome)

1. Pobierz folder `public/chrome-extension/`
2. Otwórz `chrome://extensions/`
3. Włącz **Tryb dewelopera**
4. Kliknij **Załaduj rozpakowane** → wybierz folder

### Instalacja wtyczki (Firefox)

1. Pobierz folder `public/firefox-extension/`
2. Otwórz `about:debugging#/runtime/this-firefox`
3. Kliknij **Załaduj tymczasowy dodatek**

---

## 🏹 Konfiguracja Autodarts

### Konto serwerowe (do Edge Functions)

```bash
supabase secrets set AUTODARTS_EMAIL="twoj@email.com"
supabase secrets set AUTODARTS_PASSWORD="twoje-haslo"
```

**Uwaga:** Konto serwerowe jest fallbackiem. Jeśli gracz ma aktywną sesję na Autodarts, wtyczka użyje jego tokenu w pierwszej kolejności.

---

## 🛡 Panel admina

Dostępny pod `/admin` dla użytkowników z rolą `admin`.

Sekcje: Zarządzanie ligami, meczami, graczami, integracja wtyczki, ogłoszenia, role, audit log, eksport danych.

---

## 🔐 Zmienne środowiskowe

### Frontend (`.env`)

| Zmienna | Opis | Wymagana |
|---------|------|----------|
| `VITE_SUPABASE_PROJECT_ID` | ID projektu Supabase | ✅ |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon key Supabase | ✅ |
| `VITE_SUPABASE_URL` | URL projektu Supabase | ✅ |

### Sekrety Supabase (Edge Functions)

| Sekret | Opis | Wymagana |
|--------|------|----------|
| `SUPABASE_URL` | URL projektu Supabase | ✅ (auto) |
| `SUPABASE_ANON_KEY` | Anon key | ✅ (auto) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | ✅ (auto) |
| `LOVABLE_API_KEY` | Klucz Lovable AI Gateway (auto na Lovable Cloud) | ⚠️ Tylko Lovable |
| `GEMINI_API_KEY` | Klucz Google Gemini API (self-hosting) | ⚠️ Alternatywa |
| `OPENAI_API_KEY` | Klucz OpenAI API (self-hosting) | ⚠️ Alternatywa |
| `AUTODARTS_EMAIL` | Email konta Autodarts (serwer) | ⚠️ Opcjonalna |
| `AUTODARTS_PASSWORD` | Hasło konta Autodarts | ⚠️ Opcjonalna |

---

## 🧹 Automatyczne czyszczenie Storage

Edge Function `cleanup-storage` automatycznie kasuje niepotrzebne pliki:

| Bucket | Co kasuje | Warunek |
|--------|----------|---------|
| `match-screenshots` | Stare screenshoty | Starsze niż 30 dni AND nie powiązane z żadnym meczem |
| `avatars` | Osierocone awatary | Plik nie jest używany przez żadnego gracza |

**Częstotliwość:** Codziennie o 3:00 (pg_cron lub system crontab)

**Szacowane zużycie storage:**
- Screenshoty: ~5-15 MB/dzień (zależnie od aktywności)
- Awatary: ~100 MB total (max 2 MB/plik)
- Darmowy limit Supabase Cloud: 1 GB — z czyszczeniem powinien wystarczyć

---

## 🚢 Deployment

### Lovable (najłatwiejsze)

1. Importuj projekt do Lovable
2. Backend konfiguruje się automatycznie
3. Kliknij **Publish**

### Self-hosting (VPS)

Patrz [Self-hosting na VPS — kompletny poradnik](#-self-hosting-na-vps--kompletny-poradnik).

**Checklista przed uruchomieniem:**

- [ ] Supabase Docker działa (`docker compose ps`)
- [ ] Migracje bazy wykonane (`supabase db push`)
- [ ] Buckety storage utworzone (avatars, match-screenshots)
- [ ] Frontend zbudowany i skopiowany do nginx
- [ ] Nginx skonfigurowany z SSL
- [ ] DNS ustawiony (A records)
- [ ] Konto admina utworzone
- [ ] Edge Functions wdrożone
- [ ] Sekrety ustawione (SUPABASE_*, AUTODARTS_*, AI API key)
- [ ] Cron job na czyszczenie storage
- [ ] Backup bazy skonfigurowany
- [ ] Firewall skonfigurowany

---

## 📂 Struktura projektu

```
├── public/
│   ├── chrome-extension/     # Wtyczka Chrome (Manifest V3)
│   ├── firefox-extension/    # Wtyczka Firefox (Manifest V2)
│   ├── eDART_Polska.apk      # Android APK
│   └── pwa-*.png              # Ikony PWA
├── src/
│   ├── components/            # Komponenty React
│   │   ├── ui/                # shadcn/ui components
│   │   └── ...
│   ├── contexts/              # React Contexts (Auth, League)
│   ├── hooks/                 # Custom hooks
│   ├── integrations/          # Supabase client + types (auto-generated)
│   ├── lib/                   # Utilities
│   └── pages/                 # Strony (React Router)
├── supabase/
│   ├── config.toml            # Konfiguracja Supabase
│   ├── migrations/            # Migracje SQL
│   └── functions/             # Edge Functions
│       ├── analyze-match-screenshot/
│       ├── auto-submit-league-match/
│       ├── check-league-match/
│       ├── cleanup-storage/
│       ├── fetch-autodarts-match/
│       ├── submit-match-result/
│       └── sync-autodarts/
└── .env                       # Zmienne środowiskowe
```

---

## 🤝 Rozwój

```bash
npm run dev              # Frontend dev server
supabase start           # Lokalny Supabase (opcjonalnie)
supabase functions serve # Lokalne Edge Functions (opcjonalnie)
npm run test             # Testy
npm run build            # Budowanie
```

---

## 📄 Licencja

MIT License — szczegóły w pliku `LICENSE`.
