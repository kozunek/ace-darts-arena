const ERROR_MAP: Record<string, string> = {
  "Invalid login credentials": "Nieprawidłowy email lub hasło.",
  "Email not confirmed": "Email nie został potwierdzony. Sprawdź skrzynkę pocztową.",
  "User already registered": "Użytkownik z tym adresem email już istnieje.",
  "Signup requires a valid password": "Rejestracja wymaga prawidłowego hasła.",
  "Password should be at least 6 characters": "Hasło musi mieć minimum 6 znaków.",
  "Password should be at least 6 characters.": "Hasło musi mieć minimum 6 znaków.",
  "Unable to validate email address: invalid format": "Nieprawidłowy format adresu email.",
  "A user with this email address has already been registered": "Użytkownik z tym adresem email już istnieje.",
  "User not found": "Nie znaleziono użytkownika.",
  "Token has expired or is invalid": "Link wygasł lub jest nieprawidłowy.",
  "New password should be different from the old password.": "Nowe hasło musi być inne niż dotychczasowe.",
  "New password should be different from the old password": "Nowe hasło musi być inne niż dotychczasowe.",
  "For security purposes, you can only request this once every 60 seconds": "Ze względów bezpieczeństwa możesz wysłać żądanie tylko raz na 60 sekund.",
  "For security purposes, you can only request this after 60 seconds": "Ze względów bezpieczeństwa możesz wysłać żądanie dopiero po 60 sekundach.",
  "Email rate limit exceeded": "Zbyt wiele prób. Spróbuj ponownie za chwilę.",
  "Request rate limit reached": "Zbyt wiele żądań. Spróbuj ponownie za chwilę.",
  "over_email_send_rate_limit": "Zbyt wiele emaili wysłanych. Spróbuj ponownie za chwilę.",
  "Auth session missing!": "Sesja wygasła. Zaloguj się ponownie.",
  "JWT expired": "Sesja wygasła. Zaloguj się ponownie.",
  "invalid claim: missing sub claim": "Sesja jest nieprawidłowa. Zaloguj się ponownie.",
  "Signups not allowed for this instance": "Rejestracja jest obecnie wyłączona.",
  "Email link is invalid or has expired": "Link aktywacyjny jest nieprawidłowy lub wygasł.",
  "Database error saving new user": "Błąd bazy danych podczas rejestracji. Spróbuj ponownie.",
  "duplicate key value violates unique constraint": "Taki wpis już istnieje.",
  "Permission denied": "Brak uprawnień do wykonania tej operacji.",
  "new row violates row-level security policy": "Brak uprawnień do wykonania tej operacji.",
  "check constraint": "Nieprawidłowe dane.",
};

export function translateError(msg: string | null | undefined): string {
  if (!msg) return "Wystąpił nieznany błąd.";
  if (ERROR_MAP[msg]) return ERROR_MAP[msg];
  for (const [en, pl] of Object.entries(ERROR_MAP)) {
    if (msg.toLowerCase().includes(en.toLowerCase())) return pl;
  }
  return msg;
}
