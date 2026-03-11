

Platforma do zarządzania ligami darts z integracją [Autodarts](https://autodarts.io). Automatyczne pobieranie statystyk, śledzenie wyników na żywo, tabele ligowe, turnieje i więcej.

**Strona:** [https://ace-darts-arena.lovable.app](https://ace-darts-arena.lovable.app)

---

## 📋 Spis treści

1. [Funkcjonalności](#-funkcjonalności)
2. [Architektura](#-architektura)
3. [Wymagania](#-wymagania)
4. [Instalacja i konfiguracja](#-instalacja-i-konfiguracja)
5. [Baza danych — schemat](#-baza-danych--schemat)
6. [Edge Functions](#-edge-functions)
7. [Wtyczka przeglądarki](#-wtyczka-przeglądarki)
8. [Konfiguracja Autodarts](#-konfiguracja-autodarts)
9. [Panel admina](#-panel-admina)
10. [Zmienne środowiskowe](#-zmienne-środowiskowe)
11. [Deployment](#-deployment)

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
```

**Stack technologiczny:**
- Frontend: React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion
- Backend: Supabase (PostgreSQL + Auth + Edge Functions + Realtime + Storage)
- AI: Lovable AI Gateway (Google Gemini 2.5 Flash) — analiza screenshotów
- Integracja: Autodarts API (REST + OIDC), DartCounter (OCR), DartsMind (OCR), wtyczki Chrome/Firefox
- Auth: Email/hasło + Google OAuth (Lovable Cloud managed)

---

## 📦 Wymagania

- **Node.js** ≥ 18 (lub Bun)
- **Supabase CLI** — `npm install -g supabase`
- **Konto Supabase** — [supabase.com](https://supabase.com) (darmowy plan wystarczy)
- **Konto Autodarts** — do integracji z automatycznym pobieraniem statystyk (opcjonalne)

---

## 🔧 Instalacja i konfiguracja

### 1. Sklonuj repozytorium

```bash
git clone https://github.com/TWOJ_USER/edart-polska.git
cd edart-polska
```

### 2. Zainstaluj zależności

```bash
npm install
# lub
bun install
```

### 3. Utwórz projekt Supabase

```bash
# Zaloguj się do Supabase CLI
supabase login

# Utwórz nowy projekt na supabase.com/dashboard
# Skopiuj Project ID, URL i Anon Key
```

### 4. Połącz z projektem Supabase

```bash
supabase link --project-ref TWOJ_PROJECT_ID
```

### 5. Uruchom migracje bazy danych

```bash
supabase db push
```

To automatycznie utworzy wszystkie tabele, funkcje, triggery i polityki RLS.

### 6. Skonfiguruj zmienne środowiskowe

Utwórz plik `.env` w katalogu głównym:

```env
VITE_SUPABASE_PROJECT_ID="twoj-project-id"
VITE_SUPABASE_PUBLISHABLE_KEY="twoj-anon-key"
VITE_SUPABASE_URL="https://twoj-project-id.supabase.co"
```

### 7. Skonfiguruj sekrety Supabase (Edge Functions)

```bash
# Wymagane do działania Edge Functions
supabase secrets set SUPABASE_URL="https://twoj-project-id.supabase.co"
supabase secrets set SUPABASE_ANON_KEY="twoj-anon-key"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="twoj-service-role-key"

# Opcjonalne — do automatycznego logowania do Autodarts z serwera
supabase secrets set AUTODARTS_EMAIL="twoj-email@autodarts.io"
supabase secrets set AUTODARTS_PASSWORD="twoje-haslo-autodarts"
```

### 8. Wdróż Edge Functions

```bash
supabase functions deploy fetch-autodarts-match
supabase functions deploy submit-match-result
supabase functions deploy auto-submit-league-match
supabase functions deploy check-league-match
```

### 9. Uruchom aplikację

```bash
npm run dev
# lub
bun dev
```

Aplikacja będzie dostępna pod `http://localhost:5173`.

### 10. Utwórz konto admina

1. Zarejestruj się przez formularz na stronie
2. W panelu Supabase → SQL Editor uruchom:

```sql
-- Znajdź swoje user_id
SELECT id FROM auth.users WHERE email = 'twoj@email.com';

-- Nadaj rolę admina
INSERT INTO public.user_roles (user_id, role) 
VALUES ('TWOJE_USER_ID', 'admin');
```

### 11. Logowanie przez Google (OAuth)

Logowanie przez Google działa automatycznie na platformie Lovable Cloud — nie wymaga konfiguracji.

**Jak to działa:**
- Aplikacja używa `lovable.auth.signInWithOAuth("google")` z pakietu `@lovable.dev/cloud-auth-js`
- Token Google jest automatycznie wymieniany na sesję Supabase
- PWA jest skonfigurowane z `navigateFallbackDenylist: [/^\/~oauth/]` aby nie cache'ować redirectów OAuth

**Self-hosting (własne credentials Google):**

1. Utwórz projekt w [Google Cloud Console](https://console.cloud.google.com/)
2. Włącz **Google Identity / OAuth 2.0**
3. Dodaj **Authorized redirect URL**: `https://twoja-domena.pl/~oauth` (lub URL z dashboardu Lovable Cloud)
4. Skonfiguruj `Client ID` i `Client Secret` w panelu Lovable Cloud → Authentication Settings → Google
5. Lub w Supabase Dashboard → Authentication → Providers → Google

**Bez Lovable Cloud (czysty Supabase):**

Zamień `lovable.auth.signInWithOAuth()` na `supabase.auth.signInWithOAuth()`:

```typescript
// src/pages/LoginPage.tsx — zamień handleGoogleSignIn na:
const { error } = await supabase.auth.signInWithOAuth({
  provider: "google",
  options: { redirectTo: window.location.origin },
});
```

### 12. Powiązanie kont z platformami dartowymi

Gracze mogą podać swoje nicki z platform dartowych w **Ustawienia konta**:

| Pole | Opis | Zastosowanie |
|------|------|-------------|
| **Autodarts User ID** | UUID z autodarts.io | Automatyczne pobieranie statystyk z API |
| **Nick DartCounter** | Nick z aplikacji DartCounter | Dopasowywanie graczy na screenshotach AI |
| **Nick DartsMind** | Nick z aplikacji DartsMind | Dopasowywanie graczy na screenshotach AI |

**Jak podać nick:**
1. Gracz: Ustawienia → Dane kontaktowe → wpisz nick
2. Przy rejestracji: opcjonalne pole "Nick w grze" (zapisuje się jako dartcounter_id i dartsmind_id)
3. Admin: Panel admina → Gracze → pola Autodarts ID / DartCounter / DartsMind przy każdym graczu

**Jak AI używa nicków:**
- Przy analizie screenshotów AI otrzymuje kontekst meczu (nazwy graczy z formularza)
- AI porównuje nicki ze screena z nazwami z kontekstu i automatycznie mapuje statystyki do właściwego gracza
- Niezależnie od pozycji na screenie (lewa/prawa), dane trafiają do poprawnego gracza

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

**Response (mecz ligowy):**
```json
{
  "is_league_match": true,
  "match_id": "uuid-meczu-edart",
  "league_id": "uuid-ligi",
  "league_name": "Liga Sezon 1",
  "round": 3,
  "player1_id": "uuid-gracza-edart",
  "player2_id": "uuid-gracza-edart"
}
```

**Konfiguracja w `supabase/config.toml`:**
```toml
[functions.check-league-match]
verify_jwt = false
```

### 2. `auto-submit-league-match`

**Cel:** Automatyczne zgłaszanie wyniku meczu ligowego (wywoływane przez wtyczkę).

**Endpoint:** `POST /functions/v1/auto-submit-league-match`  
**Auth:** Publiczny (`verify_jwt = false`) — autoryzacja przez anon key

**Flow:**
1. Szuka graczy w bazie (po `autodarts_user_id` lub nazwie)
2. Szuka zaplanowanego meczu (`status = 'upcoming'`)
3. Sprawdza czy mecz jest zaplanowany na dzisiaj (±1 dzień)
4. Pobiera pełne statystyki z Autodarts API (token gracza lub credentials serwera)
5. Mapuje graczy Autodarts → eDART (obsługuje zamianę kolejności)
6. Zapisuje wynik z `auto_approve` → `completed` lub `pending_approval`
7. Zapobiega duplikatom (jeśli wynik już wysłany)

**Wymagane sekrety:**
- `AUTODARTS_EMAIL` — email konta Autodarts (serwer fallback)
- `AUTODARTS_PASSWORD` — hasło konta Autodarts
- `SUPABASE_SERVICE_ROLE_KEY` — klucz serwisowy Supabase

### 3. `fetch-autodarts-match`

**Cel:** Pobieranie statystyk meczu z Autodarts API (ręczne wysyłanie wyniku).

**Endpoint:** `POST /functions/v1/fetch-autodarts-match`  
**Auth:** Bearer token (zalogowany użytkownik eDART)

**Request:**
```json
{
  "autodarts_link": "https://play.autodarts.io/history/matches/UUID",
  "autodarts_token": "opcjonalny-token-autodarts"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "score1": 3, "score2": 2,
    "avg1": 85.42, "avg2": 78.15,
    "first_9_avg1": 92.33, "first_9_avg2": 81.50,
    "avg_until_170_1": 78.20, "avg_until_170_2": 72.10,
    "one_eighties1": 2, "one_eighties2": 0,
    "high_checkout1": 120, "high_checkout2": 96,
    "ton60_1": 5, "ton60_2": 3,
    "ton80_1": 3, "ton80_2": 2,
    "ton_plus1": 2, "ton_plus2": 1,
    "ton40_1": 1, "ton40_2": 0,
    "darts_thrown1": 180, "darts_thrown2": 195,
    "checkout_attempts1": 12, "checkout_attempts2": 15,
    "checkout_hits1": 3, "checkout_hits2": 2,
    "player1_name": "Jan Kowalski",
    "player2_name": "Anna Nowak",
    "autodarts_link": "https://play.autodarts.io/history/matches/UUID"
  }
}
```

**Statystyki obliczane z danych dart-by-dart:**
- **Średnia** — `(totalScore / totalDarts) * 3` (PPD × 3 = 3-dart average)
- **First 9 Avg** — średnia z pierwszych 3 wizyt (9 lotek) w każdym legu
- **Avg Until 170** — średnia z wizyt gdzie remaining > 170
- **Checkout Attempts** — liczone per lotka: każda lotka rzucona gdy `remaining` jest dublem (2-40 parzyste lub 50/bull), **włącznie z bustami**
- **Checkout Hits** — wejście na 0 (nie-bust)
- **Zakresy tonów**: 60+ (ton60), 100+ (ton80/ton100), 140+ (ton_plus), 170+ (ton40), 180 (one_eighties)

### 4. `submit-match-result`

**Cel:** Ręczne zgłaszanie wyniku meczu przez zalogowanego gracza.

**Endpoint:** `POST /functions/v1/submit-match-result`  
**Auth:** Bearer token (zalogowany użytkownik eDART)

**Request:**
```json
{
  "match_id": "uuid-meczu",
  "score1": 3,
  "score2": 2,
  "avg1": 85.4,
  "avg2": 78.2,
  "autodarts_link": "https://play.autodarts.io/history/matches/UUID",
  "auto_complete": false
}
```

**Statusy meczu:**
- `upcoming` → mecz zaplanowany, nie rozegrany
- `pending_approval` → wynik zgłoszony, czeka na zatwierdzenie admina
- `completed` → wynik zatwierdzony

### 5. `analyze-match-screenshot` (AI Vision)

**Cel:** Automatyczne rozpoznawanie statystyk z zrzutów ekranu DartCounter/DartsMind przy użyciu AI (Gemini Vision).

**Endpoint:** `POST /functions/v1/analyze-match-screenshot`  
**Auth:** Bearer token (zalogowany użytkownik eDART)

**Request:**
```json
{
  "screenshot_urls": ["https://...storage.../screenshot1.png"],
  "match_context": {
    "player1_name": "Jan Kowalski",
    "player2_name": "Anna Nowak"
  }
}
```

**Parametry:**
- `screenshot_urls` (wymagane) — tablica URL-i do przesłanych screenshotów (1-5 sztuk)
- `match_context` (opcjonalne) — kontekst meczu ligowego, dzięki któremu AI dopasowuje graczy ze screena do formularza

**Response:**
```json
{
  "success": true,
  "data": {
    "confidence": "high",
    "platform": "dartcounter",
    "matched_to_context": true,
    "screenshot_player1_name": "JanK",
    "screenshot_player2_name": "AnnaN",
    "player1_name": "Jan Kowalski",
    "player2_name": "Anna Nowak",
    "score1": 3, "score2": 2,
    "avg1": 85.42, "avg2": 78.15,
    "one_eighties1": 2, "one_eighties2": 0,
    "high_checkout1": 120, "high_checkout2": 96
  }
}
```

**Jak działa dopasowywanie graczy:**
1. AI odczytuje nicki ze screenshota (np. „JanK" po lewej, „AnnaN" po prawej)
2. Jeśli podano `match_context`, AI porównuje nicki z kontekstem i mapuje statystyki tak, że `player1_*` = gracz 1 z formularza
3. Jeśli AI nie może dopasować, `matched_to_context = false` i frontend sam próbuje dopasować po nazwie
4. Niezależnie od pozycji na screenie (lewa/prawa), statystyki trafiają do właściwego gracza

**Confidence levels:**
- `high` — dane czytelne → może być auto-zatwierdzone
- `low` — niektóre dane nieczytelne → wymaga ręcznej weryfikacji
- `none` — screenshot nie wygląda na podsumowanie meczu darta

**Wymagane sekrety:**
- `LOVABLE_API_KEY` — automatycznie konfigurowany przez Lovable Cloud

**Limity i rate limiting:**
- **Model:** `google/gemini-2.5-flash` — szybki, idealny do OCR ze screenshotów
- **Screenshoty:** max 5 na mecz
- **Rate limit:** ~30 żądań/min na workspace (Lovable AI Gateway)
- **Koszt:** ~0.001-0.003 USD za analizę jednego meczu (1-3 screenshoty)
- **Przy dużej liczbie graczy:** 30 meczy/min wystarczy nawet dla dużych lig
- **Błąd 429:** Zbyt wiele żądań — komunikat „Spróbuj za chwilę"
- **Błąd 402:** Brak kredytów — doładuj w Lovable → Settings → Workspace → Usage

---

## 🔌 Wtyczka przeglądarki

### Wersja: 1.5.0

Wtyczka dostępna dla **Chrome** (Manifest V3) i **Firefox** (Manifest V2).

### Jak działa wtyczka

```
┌─────────────────────────────────────────────────────────┐
│                   play.autodarts.io                      │
│                                                          │
│  content.js                                              │
│  ├── Przechwytuje token z fetch/XHR do Autodarts API     │
│  ├── Monitoruje SPA navigation (pushState/popstate)      │
│  ├── Wykrywa stronę historii (/history/matches/*)         │
│  ├── Pobiera dane meczu z api.autodarts.io               │
│  ├── Wykrywa Autodarts User ID z localStorage/session     │
│  └── Wysyła dane do background.js                        │
│                                                          │
└──────────────────────┬──────────────────────────────────┘
                       │
            ┌──────────▼──────────┐
            │   background.js     │
            │                     │
            │ ├─ CHECK_LEAGUE_MATCH_LIVE                   │
            │ │  → POST check-league-match                 │
            │ │  → Powiadomienie "Mecz ligowy!"             │
            │ │                                             │
            │ ├─ LIVE_MATCH_UPDATE                         │
            │ │  → Upsert do live_matches                  │
            │ │                                             │
            │ ├─ AUTO_SUBMIT_LEAGUE_MATCH                  │
            │ │  → POST auto-submit-league-match           │
            │ │  → Powiadomienie: wynik wysłany/błąd        │
            │ │                                             │
            │ ├─ AUTODARTS_USER_ID_DETECTED                │
            │ │  → PATCH players.autodarts_user_id         │
            │ │                                             │
            │ └─ webRequest listener                       │
            │    → Przechwytuje Bearer token z API calls    │
            └──────────────────────┘
                       │
            ┌──────────▼──────────┐
            │   inject-token.js   │
            │   (na stronach eDART)│
            │                     │
            │ ├─ Dostarcza token do strony eDART            │
            │ ├─ Dostarcza dane ostatniego meczu            │
            │ ├─ Nasłuchuje na zmiany w storage             │
            │ └─ Wysyła eDART user ID do rozszerzenia       │
            └─────────────────────┘
```

### Przepływ automatycznego wysyłania wyników

1. Gracz otwiera `play.autodarts.io` → `content.js` przechwytuje token
2. Gracz rozpoczyna mecz → `content.js` wykrywa live match
3. `background.js` sprawdza w eDART czy to mecz ligowy → **powiadomienie**
4. Aktualizuje `live_matches` w czasie rzeczywistym (Realtime na stronie eDART)
5. Gracz klika "Final" → Autodarts przekierowuje na `/history/matches/UUID`
6. `content.js` wykrywa zmianę URL, pobiera dane meczu z API
7. `background.js` wywołuje `auto-submit-league-match` Edge Function
8. Wynik zapisany → **powiadomienie** z wynikiem
9. Jeśli błąd → **powiadomienie** z linkiem do ręcznego zgłoszenia

### Instalacja wtyczki (Chrome)

1. Pobierz folder `public/chrome-extension/` z repozytorium
2. Otwórz `chrome://extensions/`
3. Włącz **Tryb dewelopera** (prawy górny róg)
4. Kliknij **Załaduj rozpakowane** → wybierz folder `chrome-extension`
5. Wtyczka pojawi się na pasku narzędzi

### Instalacja wtyczki (Firefox)

1. Pobierz folder `public/firefox-extension/` z repozytorium
2. Otwórz `about:debugging#/runtime/this-firefox`
3. Kliknij **Załaduj tymczasowy dodatek** → wybierz dowolny plik z folderu
4. Wtyczka pojawi się na pasku narzędzi

### Konfiguracja wtyczki dla własnego serwera

W plikach `background.js` (Chrome i Firefox) zmień:

```javascript
// background.js — linie 1-4
const EDART_URL = "https://twoja-domena.pl";
const SUPABASE_URL = "https://twoj-project-id.supabase.co";
const SUPABASE_ANON_KEY = "twoj-anon-key";
```

W plikach `manifest.json` zaktualizuj `host_permissions` (Chrome) lub `permissions` (Firefox):

```json
{
  "host_permissions": [
    "https://login.autodarts.io/*",
    "https://play.autodarts.io/*",
    "https://api.autodarts.io/*",
    "https://twoja-domena.pl/*",
    "https://twoj-project-id.supabase.co/*"
  ]
}
```

W `content_scripts` zmień `matches` dla `inject-token.js`:

```json
{
  "matches": ["https://twoja-domena.pl/*"],
  "js": ["inject-token.js"],
  "run_at": "document_idle"
}
```

W `popup.html` zmień linki do Twojej domeny:

```html
<li>Wróć do <a href="https://twoja-domena.pl/submit" target="_blank">eDART</a>...</li>
```

### Pliki wtyczki

| Plik | Opis |
|------|------|
| `manifest.json` | Konfiguracja rozszerzenia (permissions, content scripts) |
| `background.js` | Service worker — komunikacja z Supabase, powiadomienia, auto-submit |
| `content.js` | Skrypt na `play.autodarts.io` — przechwytuje token, wykrywa mecze |
| `inject-token.js` | Skrypt na stronach eDART — dostarcza token i dane meczu do aplikacji |
| `popup.html/js` | Popup rozszerzenia — status tokena, kopiowanie, link do Autodarts |
| `icon48.png` | Ikona 48×48 |
| `icon128.png` | Ikona 128×128 |

---

## 🏹 Konfiguracja Autodarts

### Konto serwerowe (do Edge Functions)

Aby Edge Functions mogły samodzielnie pobierać statystyki z Autodarts, potrzebujesz konta Autodarts z dostępem do API.

1. Utwórz konto na [autodarts.io](https://autodarts.io) (lub użyj istniejącego)
2. Ustaw sekrety w Supabase:

```bash
supabase secrets set AUTODARTS_EMAIL="twoj@email.com"
supabase secrets set AUTODARTS_PASSWORD="twoje-haslo"
```

**Uwaga:** Konto serwerowe jest fallbackiem. Jeśli gracz ma aktywną sesję na Autodarts, wtyczka użyje jego tokenu w pierwszej kolejności.

### Łączenie kont graczy z Autodarts

Gracze mogą powiązać konto eDART z Autodarts na dwa sposoby:

1. **Automatycznie** — wtyczka wykrywa `autodarts_user_id` z `localStorage` i zapisuje do profilu gracza
2. **Ręcznie** — admin może wpisać `autodarts_user_id` w panelu zarządzania graczami

Powiązanie kont pozwala na dokładniejsze matchowanie graczy (po UUID zamiast nazwy).

---

## 🛡 Panel admina

Dostępny pod `/admin` dla użytkowników z rolą `admin`.

### Sekcje panelu admina

1. **Zarządzanie ligami** — tworzenie, edycja, generowanie meczów, reguły bonusowe
2. **Zarządzanie meczami** — zatwierdzanie wyników, edycja, usuwanie
3. **Zarządzanie graczami** — zatwierdzanie, edycja profili, usuwanie
4. **Integracja wtyczki** — konfiguracja auto-approve, wymagane statystyki, endpoint API
5. **Ogłoszenia** — tworzenie pinned announcements
6. **Role** — nadawanie/odbieranie ról (admin, moderator, user)
7. **Audit log** — historia zmian w meczach
8. **Eksport** — eksport danych (CSV)

### Ustawienia integracji wtyczki

W panelu admina → Integracje:

| Opcja | Opis |
|-------|------|
| **Webhook aktywny** | Zezwalaj na przesyłanie wyników przez API |
| **Auto-zatwierdzanie (automatyczne)** | Wyniki wysłane przez wtyczkę automatycznie zatwierdzane |
| **Auto-zatwierdzanie (ręczne/link)** | Wyniki z linku Autodarts automatycznie zatwierdzane |
| **Wymagane: Średnia** | Pole średniej wymagane przy zgłoszeniu |
| **Wymagane: 180-tki** | Pole 180-tek wymagane |
| **Wymagane: Najwyższy checkout** | Pole high checkout wymagane |
| **Wymagane: Checkout stats** | Próby i trafienia checkout wymagane |
| **Wymagane: Rzucone lotki** | Pole darts thrown wymagane |
| **Wymagane: Zakresy tonów** | 60+, 100+, 140+, 170+ wymagane |
| **Wymagane: Link Autodarts** | Link do meczu wymagany |

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
| `AUTODARTS_EMAIL` | Email konta Autodarts (serwer) | ⚠️ Opcjonalna |
| `AUTODARTS_PASSWORD` | Hasło konta Autodarts | ⚠️ Opcjonalna |

> ⚠️ `AUTODARTS_EMAIL` i `AUTODARTS_PASSWORD` są opcjonalne. Bez nich Edge Functions nadal działają, ale wymagają tokenu gracza z wtyczki. Z nimi — serwer może samodzielnie pobierać dane jako fallback.

---

## 🚢 Deployment

### Lovable (rekomendowane)

Projekt działa natywnie na platformie [Lovable](https://lovable.dev) z automatycznym backendem (Lovable Cloud / Supabase).

1. Importuj projekt do Lovable
2. Backend konfiguruje się automatycznie
3. Kliknij **Publish** aby wdrożyć

### Self-hosting

#### Frontend

```bash
npm run build
# Pliki w dist/ — serwuj przez nginx, Vercel, Netlify, etc.
```

Przykład nginx:

```nginx
server {
    listen 80;
    server_name twoja-domena.pl;
    root /var/www/edart/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

#### Backend (Supabase)

Opcja A — **Supabase Cloud** (rekomendowane):
- Utwórz projekt na [supabase.com](https://supabase.com)
- Uruchom migracje: `supabase db push`
- Wdróż Edge Functions: `supabase functions deploy`

Opcja B — **Self-hosted Supabase**:
- Uruchom Supabase lokalnie: [docs.supabase.com/guides/self-hosting](https://supabase.com/docs/guides/self-hosting)
- Zmień `VITE_SUPABASE_URL` na adres lokalnego Supabase
- Wdróż Edge Functions: `supabase functions deploy`

#### Wtyczka

Po zmianie domeny, zaktualizuj pliki wtyczki (patrz [Konfiguracja wtyczki](#konfiguracja-wtyczki-dla-własnego-serwera)) i opublikuj w Chrome Web Store lub dystrybuuj jako rozpakowane rozszerzenie.

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
│   │   ├── ExtensionConfigPanel.tsx
│   │   ├── LeagueTable.tsx
│   │   ├── BracketView.tsx
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
│       ├── auto-submit-league-match/
│       ├── check-league-match/
│       ├── fetch-autodarts-match/
│       ├── submit-match-result/
│       └── sync-autodarts/
└── .env                       # Zmienne środowiskowe
```

---

## 🤝 Rozwój

### Lokalne uruchomienie

```bash
npm run dev          # Frontend dev server
supabase start       # Lokalny Supabase (opcjonalnie)
supabase functions serve  # Lokalne Edge Functions (opcjonalnie)
```

### Testy

```bash
npm run test
```

### Budowanie

```bash
npm run build
```

---

## 📄 Licencja

MIT License — szczegóły w pliku `LICENSE`.
