import { motion } from "framer-motion";
import { Target, Monitor, Smartphone, Camera, Link2, Upload, CheckCircle2, UserPlus, LogIn, Gamepad2, ArrowRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const platforms = [
  {
    id: "autodarts",
    name: "Autodarts",
    icon: <Monitor className="h-6 w-6" />,
    color: "primary",
    description: "Elektroniczna tarcza z kamerami i automatycznym zliczaniem punktów. Najprostsza opcja — wyniki przesyłane automatycznie.",
    steps: [
      {
        title: "Załóż konto na Autodarts",
        desc: "Wejdź na play.autodarts.io i utwórz konto. Skonfiguruj swoją tarczę według instrukcji producenta.",
        icon: <UserPlus className="h-4 w-4" />,
      },
      {
        title: "Zarejestruj się w eDART Polska",
        desc: "Załóż konto na naszej stronie i podaj swój Autodarts User ID w ustawieniach profilu.",
        icon: <LogIn className="h-4 w-4" />,
      },
      {
        title: "Zainstaluj wtyczkę przeglądarkową",
        desc: "Pobierz wtyczkę Chrome/Firefox ze strony \"Pobieranie\". Wtyczka automatycznie wykryje token i Twój ID.",
        icon: <Download className="h-4 w-4" />,
      },
      {
        title: "Dołącz do ligi",
        desc: "Poczekaj na zatwierdzenie przez administratora. Gdy liga ma otwartą rejestrację — możesz dołączyć sam.",
        icon: <Target className="h-4 w-4" />,
      },
      {
        title: "Zagraj mecz!",
        desc: "Utwórz lobby na Autodarts, zaproś przeciwnika i zagrajcie mecz. Wtyczka automatycznie wykryje mecz ligowy i prześle wynik do eDART Polska.",
        icon: <Gamepad2 className="h-4 w-4" />,
      },
      {
        title: "Wynik pojawi się automatycznie",
        desc: "Po zakończeniu meczu, wynik wraz ze statystykami (średnia, 180-tki, checkouty) trafi do systemu. W zależności od ustawień admina — zostanie zatwierdzony automatycznie lub trafi do weryfikacji.",
        icon: <CheckCircle2 className="h-4 w-4" />,
      },
    ],
  },
  {
    id: "dartcounter",
    name: "DartCounter",
    icon: <Smartphone className="h-6 w-6" />,
    color: "secondary",
    description: "Popularna aplikacja mobilna do zliczania punktów. Wymaga ręcznego zgłoszenia wyniku ze screenshotem.",
    steps: [
      {
        title: "Pobierz DartCounter",
        desc: "Zainstaluj aplikację DartCounter z Google Play lub App Store. Załóż konto i zapamiętaj swoją nazwę użytkownika.",
        icon: <Smartphone className="h-4 w-4" />,
      },
      {
        title: "Zarejestruj się w eDART Polska",
        desc: "Załóż konto na naszej stronie. W ustawieniach profilu podaj swój DartCounter ID.",
        icon: <LogIn className="h-4 w-4" />,
      },
      {
        title: "Dołącz do ligi",
        desc: "Poczekaj na zatwierdzenie i dołączenie do aktywnej ligi przez administratora.",
        icon: <Target className="h-4 w-4" />,
      },
      {
        title: "Zagraj mecz w DartCounter",
        desc: "Rozpocznij mecz z przeciwnikiem w aplikacji DartCounter. Grajcie zgodnie z formatem ligi (np. Best of 5).",
        icon: <Gamepad2 className="h-4 w-4" />,
      },
      {
        title: "Zrób screenshot wyniku",
        desc: "Po zakończeniu meczu zrób zrzut ekranu z podsumowaniem wyniku (legi, średnia, checkout). Upewnij się, że widać nazwy obu graczy.",
        icon: <Camera className="h-4 w-4" />,
      },
      {
        title: "Zgłoś wynik na eDART",
        desc: "Wejdź w \"Dodaj Wynik\", wybierz platformę DartCounter, załaduj screenshot i uzupełnij wynik. AI automatycznie odczyta statystyki ze zdjęcia.",
        icon: <Upload className="h-4 w-4" />,
      },
    ],
  },
  {
    id: "dartsmind",
    name: "DartsMind",
    icon: <Target className="h-6 w-6" />,
    color: "accent",
    description: "Aplikacja treningowa i meczowa. Proces zgłaszania wyników jest analogiczny do DartCounter.",
    steps: [
      {
        title: "Pobierz DartsMind",
        desc: "Zainstaluj aplikację DartsMind z Google Play lub App Store.",
        icon: <Smartphone className="h-4 w-4" />,
      },
      {
        title: "Zarejestruj się w eDART Polska",
        desc: "Załóż konto na naszej stronie. W ustawieniach profilu podaj swój DartsMind ID.",
        icon: <LogIn className="h-4 w-4" />,
      },
      {
        title: "Dołącz do ligi",
        desc: "Poczekaj na zatwierdzenie przez administratora i dodanie do ligi.",
        icon: <Target className="h-4 w-4" />,
      },
      {
        title: "Zagraj mecz w DartsMind",
        desc: "Utwórz mecz z przeciwnikiem w aplikacji DartsMind. Grajcie zgodnie z formatem ligi.",
        icon: <Gamepad2 className="h-4 w-4" />,
      },
      {
        title: "Zrób screenshot wyniku",
        desc: "Po zakończeniu meczu wykonaj zrzut ekranu podsumowania z wynikiem i statystykami.",
        icon: <Camera className="h-4 w-4" />,
      },
      {
        title: "Zgłoś wynik na eDART",
        desc: "Wejdź w \"Dodaj Wynik\", wybierz platformę DartsMind, wgraj screenshot i uzupełnij dane meczu.",
        icon: <Upload className="h-4 w-4" />,
      },
    ],
  },
];

const HowToPlayPage = () => {
  return (
    <div>
      <PageHeader title="Jak grać?" subtitle="Przewodnik krok po kroku dla każdej platformy" />
      <div className="container mx-auto px-4 py-8 max-w-4xl">

      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 mb-8">
        <p className="text-sm font-body text-foreground">
          <strong>eDART Polska</strong> to liga darta online, w której gracze mogą rywalizować korzystając z różnych platform. 
          Wybierz swoją platformę poniżej i postępuj zgodnie z instrukcją, aby rozpocząć grę w lidze!
        </p>
      </div>

      <div className="space-y-10">
        {platforms.map((platform, pIdx) => (
          <motion.section
            key={platform.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: pIdx * 0.15 }}
            className="rounded-xl border border-border bg-card p-6 md:p-8 card-glow"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`h-12 w-12 rounded-xl bg-${platform.color}/10 border border-${platform.color}/20 flex items-center justify-center text-${platform.color}`}>
                {platform.icon}
              </div>
              <div>
                <h2 className="text-xl font-display font-bold text-foreground">{platform.name}</h2>
                <p className="text-sm text-muted-foreground font-body">{platform.description}</p>
              </div>
            </div>

            {platform.id === "autodarts" && (
              <div className="my-4 flex items-center gap-2 rounded-md bg-secondary/10 border border-secondary/20 px-3 py-2">
                <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" />
                <span className="text-xs font-body text-secondary">
                  <strong>Rekomendowane!</strong> Dzięki wtyczce wyniki przesyłane są w 100% automatycznie.
                </span>
              </div>
            )}

            <ol className="mt-6 space-y-4">
              {platform.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <span className="text-xs font-display font-bold text-primary">{i + 1}</span>
                  </div>
                  <div className="flex-1 pt-0.5">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-primary">{step.icon}</span>
                      <h3 className="text-sm font-display font-bold text-foreground">{step.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground font-body leading-relaxed">{step.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </motion.section>
        ))}
      </div>

      {/* Quick links */}
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/login">
          <div className="rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-all text-center card-glow">
            <LogIn className="h-6 w-6 text-primary mx-auto mb-2" />
            <span className="text-sm font-display font-bold text-foreground">Zarejestruj się</span>
          </div>
        </Link>
        <Link to="/downloads">
          <div className="rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-all text-center card-glow">
            <Download className="h-6 w-6 text-primary mx-auto mb-2" />
            <span className="text-sm font-display font-bold text-foreground">Pobierz wtyczkę</span>
          </div>
        </Link>
        <Link to="/submit">
          <div className="rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-all text-center card-glow">
            <Upload className="h-6 w-6 text-primary mx-auto mb-2" />
            <span className="text-sm font-display font-bold text-foreground">Dodaj wynik</span>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default HowToPlayPage;
