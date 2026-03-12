import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PrivacyPolicyPage = () => (
  <div className="container mx-auto px-4 py-8 max-w-3xl">
    <Link to="/">
      <Button variant="ghost" size="sm" className="mb-6 font-display uppercase tracking-wider text-xs">
        <ArrowLeft className="h-4 w-4 mr-1" /> Powrót
      </Button>
    </Link>

    <h1 className="text-3xl font-display font-bold text-foreground mb-8">Polityka Prywatności</h1>

    <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-foreground/90 font-body">
      <p className="text-muted-foreground text-sm">Ostatnia aktualizacja: 12 marca 2026 r.</p>

      <section>
        <h2 className="text-xl font-display font-bold text-foreground">1. Administrator Danych Osobowych</h2>
        <p>Administratorem danych osobowych jest EDARTPOLSKA (dalej: „Administrator"), prowadzący serwis internetowy eDART Polska dostępny pod adresem ace-darts-arena.lovable.app.</p>
        <p>Kontakt z Administratorem: <a href="mailto:kontakt@edartspolska.pl" className="text-primary hover:underline">kontakt@edartspolska.pl</a></p>
      </section>

      <section>
        <h2 className="text-xl font-display font-bold text-foreground">2. Podstawa prawna przetwarzania danych</h2>
        <p>Dane osobowe przetwarzane są na podstawie:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Art. 6 ust. 1 lit. a) RODO — zgoda osoby, której dane dotyczą (rejestracja konta);</li>
          <li>Art. 6 ust. 1 lit. b) RODO — niezbędność do wykonania umowy (uczestnictwo w lidze);</li>
          <li>Art. 6 ust. 1 lit. f) RODO — prawnie uzasadniony interes Administratora (statystyki, bezpieczeństwo, przeciwdziałanie nadużyciom).</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-display font-bold text-foreground">3. Zakres zbieranych danych</h2>
        <p>W ramach korzystania z serwisu zbieramy następujące dane:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Dane rejestracyjne:</strong> imię/pseudonim, adres e-mail, hasło (przechowywane w formie zaszyfrowanej);</li>
          <li><strong>Dane kontaktowe (opcjonalne):</strong> numer telefonu, nick Discord;</li>
          <li><strong>Dane profilowe:</strong> avatar/zdjęcie profilowe, identyfikatory platform zewnętrznych (Autodarts, DartCounter, DartsMind);</li>
          <li><strong>Dane dotyczące rozgrywek:</strong> wyniki meczów, statystyki gry, zrzuty ekranu z meczów;</li>
          <li><strong>Dane techniczne:</strong> adres IP, typ przeglądarki, informacje o urządzeniu (zbierane automatycznie w logach serwera).</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-display font-bold text-foreground">4. Cele przetwarzania danych</h2>
        <p>Dane osobowe przetwarzane są w celu:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Utworzenia i zarządzania kontem użytkownika;</li>
          <li>Organizacji i prowadzenia lig oraz turniejów darts;</li>
          <li>Prowadzenia tabel wyników, statystyk i rankingów;</li>
          <li>Umożliwienia kontaktu między graczami w celu umawiania meczów;</li>
          <li>Wyświetlania publicznych statystyk i osiągnięć;</li>
          <li>Wysyłania powiadomień związanych z meczami i ligą;</li>
          <li>Zapewnienia bezpieczeństwa i integralności serwisu;</li>
          <li>Obsługi zgłoszeń błędów i komunikacji z użytkownikami.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-display font-bold text-foreground">5. Udostępnianie danych</h2>
        <p>Dane osobowe mogą być udostępniane:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Innym uczestnikom ligi:</strong> pseudonim, avatar i statystyki gry są widoczne publicznie; dane kontaktowe (telefon, Discord) udostępniane są wyłącznie aktualnym przeciwnikom meczowym;</li>
          <li><strong>Dostawcom usług technicznych:</strong> hosting (Supabase/Lovable), w zakresie niezbędnym do świadczenia usługi;</li>
          <li><strong>Platformom integracyjnym:</strong> Discord (w przypadku włączenia webhooka — jedynie pseudonim i wynik meczu).</li>
        </ul>
        <p>Dane nie są sprzedawane ani udostępniane podmiotom trzecim w celach marketingowych.</p>
      </section>

      <section>
        <h2 className="text-xl font-display font-bold text-foreground">6. Okres przechowywania danych</h2>
        <p>Dane przechowywane są przez okres posiadania konta w serwisie. Po usunięciu konta dane osobowe zostaną trwale usunięte w ciągu 30 dni, z wyjątkiem zanonimizowanych statystyk meczowych, które mogą zostać zachowane w celach archiwalnych.</p>
      </section>

      <section>
        <h2 className="text-xl font-display font-bold text-foreground">7. Prawa użytkownika</h2>
        <p>Zgodnie z RODO, każdy użytkownik ma prawo do:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Dostępu</strong> do swoich danych osobowych;</li>
          <li><strong>Sprostowania</strong> nieprawidłowych danych;</li>
          <li><strong>Usunięcia</strong> danych („prawo do bycia zapomnianym") — dostępne w ustawieniach konta;</li>
          <li><strong>Ograniczenia</strong> przetwarzania;</li>
          <li><strong>Przenoszenia</strong> danych;</li>
          <li><strong>Sprzeciwu</strong> wobec przetwarzania;</li>
          <li><strong>Cofnięcia zgody</strong> w dowolnym momencie, bez wpływu na zgodność z prawem przetwarzania dokonanego przed cofnięciem.</li>
        </ul>
        <p>Użytkownik ma również prawo wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych (ul. Stawki 2, 00-193 Warszawa).</p>
      </section>

      <section>
        <h2 className="text-xl font-display font-bold text-foreground">8. Pliki cookies</h2>
        <p>Serwis wykorzystuje pliki cookies wyłącznie w celach technicznych (utrzymanie sesji użytkownika, uwierzytelnianie). Nie stosujemy cookies reklamowych ani analitycznych podmiotów trzecich.</p>
      </section>

      <section>
        <h2 className="text-xl font-display font-bold text-foreground">9. Bezpieczeństwo danych</h2>
        <p>Administrator stosuje odpowiednie środki techniczne i organizacyjne w celu ochrony danych osobowych, w tym:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Szyfrowanie haseł;</li>
          <li>Szyfrowanie połączeń (HTTPS/TLS);</li>
          <li>Kontrolę dostępu na poziomie wierszy bazy danych (Row Level Security);</li>
          <li>Regularne kopie zapasowe.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-display font-bold text-foreground">10. Zmiany w Polityce Prywatności</h2>
        <p>Administrator zastrzega sobie prawo do zmiany niniejszej Polityki Prywatności. O wszelkich istotnych zmianach użytkownicy zostaną poinformowani za pośrednictwem powiadomień w serwisie.</p>
      </section>
    </div>
  </div>
);

export default PrivacyPolicyPage;
