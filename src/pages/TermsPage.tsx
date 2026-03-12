import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const TermsPage = () => (
  <div className="container mx-auto px-4 py-8 max-w-3xl">
    <Link to="/">
      <Button variant="ghost" size="sm" className="mb-6 font-display uppercase tracking-wider text-xs">
        <ArrowLeft className="h-4 w-4 mr-1" /> Powrót
      </Button>
    </Link>

    <h1 className="text-3xl font-display font-bold text-foreground mb-8">Regulamin Serwisu eDART Polska</h1>

    <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-foreground/90 font-body">
      <p className="text-muted-foreground text-sm">Ostatnia aktualizacja: 12 marca 2026 r.</p>

      <section>
        <h2 className="text-xl font-display font-bold text-foreground">§1. Postanowienia ogólne</h2>
        <ol className="list-decimal pl-6 space-y-1">
          <li>Niniejszy regulamin (dalej: „Regulamin") określa zasady korzystania z serwisu internetowego eDART Polska (dalej: „Serwis").</li>
          <li>Właścicielem i operatorem Serwisu jest EDARTPOLSKA (dalej: „Organizator").</li>
          <li>Serwis służy do organizacji i zarządzania ligami oraz turniejami darts w formule online i stacjonarnej.</li>
          <li>Korzystanie z Serwisu oznacza akceptację niniejszego Regulaminu oraz Polityki Prywatności.</li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-display font-bold text-foreground">§2. Definicje</h2>
        <ol className="list-decimal pl-6 space-y-1">
          <li><strong>Użytkownik</strong> — każda osoba korzystająca z Serwisu, posiadająca aktywne konto.</li>
          <li><strong>Gracz</strong> — Użytkownik zarejestrowany i zatwierdzony do uczestnictwa w rozgrywkach ligowych.</li>
          <li><strong>Liga</strong> — organizowane przez Organizatora rozgrywki darts z określonym regulaminem sportowym.</li>
          <li><strong>Mecz</strong> — pojedyncze spotkanie dwóch Graczy w ramach Ligi.</li>
          <li><strong>Konto</strong> — indywidualny profil Użytkownika w Serwisie, chroniony hasłem.</li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-display font-bold text-foreground">§3. Rejestracja i Konto</h2>
        <ol className="list-decimal pl-6 space-y-1">
          <li>Rejestracja w Serwisie jest bezpłatna i wymaga podania imienia/pseudonimu, adresu e-mail oraz hasła.</li>
          <li>Użytkownik zobowiązuje się do podania prawdziwych danych i ich aktualizacji w razie zmiany.</li>
          <li>Jedno konto może być przypisane wyłącznie do jednej osoby fizycznej. Zakaz tworzenia kont wielokrotnych.</li>
          <li>Użytkownik odpowiada za zachowanie poufności swojego hasła.</li>
          <li>Organizator zastrzega sobie prawo do odmowy rejestracji lub zawieszenia konta bez podania przyczyny.</li>
          <li>Użytkownik ma prawo do usunięcia swojego konta w dowolnym momencie poprzez funkcję dostępną w ustawieniach konta, zgodnie z art. 17 RODO.</li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-display font-bold text-foreground">§4. Zasady uczestnictwa w Lidze</h2>
        <ol className="list-decimal pl-6 space-y-1">
          <li>Uczestnictwo w Lidze wymaga posiadania konta w Serwisie oraz zatwierdzenia przez Organizatora.</li>
          <li>Gracz zobowiązuje się do rozegrania wszystkich przydzielonych meczów w wyznaczonym terminie.</li>
          <li>Nierozegranie meczu w terminie może skutkować przyznaniem walkowerem na niekorzyść Gracza, który nie stawił się na mecz.</li>
          <li>Wyniki meczów mogą być zgłaszane ręcznie, poprzez zrzut ekranu lub automatycznie z platformy Autodarts.</li>
          <li>Organizator zastrzega sobie prawo do weryfikacji i korekty wyników.</li>
          <li>Gracze zobowiązani są do fair play. Wszelkie formy oszustwa, manipulacji wynikami lub nadużyć technicznych skutkują dyskwalifikacją.</li>
          <li>Organizator może dyskwalifikować Gracza z Ligi w przypadku naruszenia Regulaminu lub zasad sportowej rywalizacji.</li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-display font-bold text-foreground">§5. Zgłaszanie wyników</h2>
        <ol className="list-decimal pl-6 space-y-1">
          <li>Wyniki meczów zgłaszane są przez Graczy za pośrednictwem formularza w Serwisie lub automatycznie przez wtyczkę przeglądarki.</li>
          <li>Zgłoszony wynik wymaga zatwierdzenia przez Organizatora lub system automatyczny, w zależności od konfiguracji Ligi.</li>
          <li>Gracz zgłaszający wynik zobowiązany jest do podania prawidłowych i kompletnych danych, w tym statystyk meczowych.</li>
          <li>Fałszywe zgłoszenie wyniku jest traktowane jako naruszenie Regulaminu i może skutkować dyskwalifikacją.</li>
          <li>W przypadku sporu dotyczącego wyniku, decyzja Organizatora jest ostateczna.</li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-display font-bold text-foreground">§6. Statystyki i dane meczowe</h2>
        <ol className="list-decimal pl-6 space-y-1">
          <li>Statystyki meczowe (średnia, 180, high checkout itp.) są zbierane i prezentowane publicznie w ramach Serwisu.</li>
          <li>Statystyki służą celom informacyjnym, rankingowym oraz do przyznawania osiągnięć.</li>
          <li>Gracz wyraża zgodę na publiczne wyświetlanie swoich statystyk meczowych w ramach Serwisu.</li>
          <li>Po usunięciu konta, statystyki meczowe mogą zostać zanonimizowane i zachowane w celach archiwalnych.</li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-display font-bold text-foreground">§7. Komunikacja między Graczami</h2>
        <ol className="list-decimal pl-6 space-y-1">
          <li>Serwis umożliwia Graczom kontakt w celu umawiania meczów poprzez system propozycji terminów oraz czat.</li>
          <li>Dane kontaktowe (telefon, Discord) są udostępniane wyłącznie aktualnym przeciwnikom meczowym.</li>
          <li>Zabrania się wykorzystywania danych kontaktowych w celach niezwiązanych z rozgrywkami ligowymi.</li>
          <li>Wszelkie formy nękania, obraźliwych wiadomości lub zachowań niesportowych są zabronione i mogą skutkować zablokowaniem konta.</li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-display font-bold text-foreground">§8. Integracje z platformami zewnętrznymi</h2>
        <ol className="list-decimal pl-6 space-y-1">
          <li>Serwis umożliwia integrację z platformami: Autodarts, DartCounter, DartsMind.</li>
          <li>Podanie identyfikatorów na tych platformach jest dobrowolne.</li>
          <li>Gracz wyraża zgodę na automatyczne pobieranie wyników meczów z połączonych platform.</li>
          <li>Organizator nie ponosi odpowiedzialności za dostępność i poprawność danych z platform zewnętrznych.</li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-display font-bold text-foreground">§9. Własność intelektualna</h2>
        <ol className="list-decimal pl-6 space-y-1">
          <li>Wszelkie treści, grafiki, logotypy i oprogramowanie Serwisu stanowią własność Organizatora i są chronione prawem autorskim.</li>
          <li>Kopiowanie, rozpowszechnianie lub modyfikowanie treści Serwisu bez zgody Organizatora jest zabronione.</li>
          <li>Użytkownik zachowuje prawa do treści przesłanych do Serwisu (np. zrzuty ekranu), udzielając jednocześnie Organizatorowi niewyłącznej licencji na ich wykorzystanie w ramach Serwisu.</li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-display font-bold text-foreground">§10. Odpowiedzialność</h2>
        <ol className="list-decimal pl-6 space-y-1">
          <li>Organizator dokłada wszelkich starań, aby Serwis działał poprawnie, jednak nie gwarantuje jego nieprzerwanej dostępności.</li>
          <li>Organizator nie ponosi odpowiedzialności za szkody wynikające z przerw w działaniu Serwisu, utraty danych lub działań osób trzecich.</li>
          <li>Użytkownik korzysta z Serwisu na własne ryzyko.</li>
          <li>Organizator nie ponosi odpowiedzialności za treści publikowane przez Użytkowników.</li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-display font-bold text-foreground">§11. Usunięcie konta</h2>
        <ol className="list-decimal pl-6 space-y-1">
          <li>Użytkownik ma prawo usunąć swoje konto w dowolnym momencie za pośrednictwem ustawień konta w Serwisie.</li>
          <li>Usunięcie konta jest nieodwracalne i skutkuje trwałym usunięciem danych osobowych Użytkownika w ciągu 30 dni.</li>
          <li>Zanonimizowane statystyki meczowe mogą zostać zachowane w celach archiwalnych i historycznych Ligi.</li>
          <li>W przypadku aktywnego uczestnictwa w Lidze, usunięcie konta może skutkować przyznaniem walkoweru w nierozegranych meczach.</li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-display font-bold text-foreground">§12. Postanowienia końcowe</h2>
        <ol className="list-decimal pl-6 space-y-1">
          <li>Organizator zastrzega sobie prawo do zmiany Regulaminu. Użytkownicy zostaną poinformowani o zmianach za pośrednictwem powiadomień w Serwisie.</li>
          <li>W sprawach nieuregulowanych niniejszym Regulaminem zastosowanie mają przepisy prawa polskiego, w szczególności Kodeksu cywilnego, ustawy o świadczeniu usług drogą elektroniczną oraz RODO.</li>
          <li>Wszelkie spory wynikające z korzystania z Serwisu rozstrzygane będą przez sąd właściwy dla siedziby Organizatora.</li>
          <li>Regulamin wchodzi w życie z dniem 12 marca 2026 r.</li>
        </ol>
      </section>
    </div>
  </div>
);

export default TermsPage;
