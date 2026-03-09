import { Smartphone, Download, Shield, Wifi, Bell, Zap, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useState } from "react";

const features = [
  { icon: <Zap className="h-5 w-5" />, title: "Szybki dostęp", desc: "Aplikacja działa jak natywna — uruchamia się z ekranu głównego, bez otwierania przeglądarki." },
  { icon: <Wifi className="h-5 w-5" />, title: "Tryb offline", desc: "Przeglądaj tabelę i wyniki nawet bez połączenia z internetem." },
  { icon: <Bell className="h-5 w-5" />, title: "Powiadomienia", desc: "Otrzymuj powiadomienia o nadchodzących meczach i wynikach na żywo." },
  { icon: <Shield className="h-5 w-5" />, title: "Bezpieczeństwo", desc: "Plik APK pochodzi bezpośrednio z eDART Polska — bez reklam i zbędnych uprawnień." },
];

const steps = [
  "Pobierz plik APK klikając przycisk poniżej.",
  "Otwórz pobrany plik na telefonie z Androidem.",
  "Jeśli pojawi się ostrzeżenie — zezwól na instalację z nieznanych źródeł (jednorazowo).",
  "Kliknij \"Zainstaluj\" i poczekaj na zakończenie instalacji.",
  "Gotowe! Znajdziesz aplikację eDART Polska na ekranie głównym.",
];

const ApkDownloadSection = () => {
  const [showSteps, setShowSteps] = useState(false);

  return (
    <section className="rounded-xl border border-border bg-card p-6 md:p-8 card-glow">
      <div className="flex flex-col md:flex-row md:items-start gap-6">
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-foreground">Aplikacja Android</h2>
              <p className="text-sm text-muted-foreground font-body">eDART Polska – APK v1.0</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground font-body leading-relaxed">
            Zainstaluj aplikację eDART Polska bezpośrednio na telefonie z Androidem.
            Śledź wyniki, tabelę i nadchodzące mecze w wygodnej, natywnej formie.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border"
              >
                <span className="text-primary mt-0.5">{f.icon}</span>
                <div>
                  <div className="text-sm font-display font-semibold text-foreground">{f.title}</div>
                  <div className="text-xs text-muted-foreground font-body">{f.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <a href="/eDART_Polska.apk" download="eDART_Polska.apk">
              <Button variant="hero" size="lg" className="gap-2">
                <Download className="h-4 w-4" /> Pobierz APK
              </Button>
            </a>
            <Button
              variant="outline"
              size="lg"
              className="font-display uppercase tracking-wider gap-2"
              onClick={() => setShowSteps(!showSteps)}
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${showSteps ? "rotate-180" : ""}`} />
              Jak zainstalować?
            </Button>
          </div>
        </div>
      </div>

      {showSteps && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-6 pt-6 border-t border-border"
        >
          <h3 className="text-sm font-display font-bold text-foreground uppercase tracking-wider mb-4">
            Instrukcja instalacji
          </h3>
          <ol className="space-y-3">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-display font-bold text-primary">
                  {i + 1}
                </span>
                <span className="text-sm text-muted-foreground font-body pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </motion.div>
      )}
    </section>
  );
};

export default ApkDownloadSection;
