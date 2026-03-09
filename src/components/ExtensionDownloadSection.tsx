import { Chrome, Download, Shield, Zap, Eye, Gamepad2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useState } from "react";

const features = [
  { icon: <Zap className="h-5 w-5" />, title: "Auto-wykrywanie tokena", desc: "Automatycznie przechwytuje token Autodarts po zalogowaniu — zero ręcznej konfiguracji." },
  { icon: <Gamepad2 className="h-5 w-5" />, title: "Auto-uzupełnianie ID", desc: "Wykrywa Twój Autodarts User ID i zapisuje go w profilu eDART Polska." },
  { icon: <Eye className="h-5 w-5" />, title: "Live Score", desc: "Rozpoznaje mecze ligowe i przesyła wynik na żywo — inni gracze widzą Twój mecz w czasie rzeczywistym." },
  { icon: <Shield className="h-5 w-5" />, title: "Bezpieczeństwo", desc: "Dane przesyłane są bezpośrednio do eDART Polska. Wtyczka nie zbiera żadnych danych osobowych." },
];

const steps = [
  "Pobierz plik ZIP z wtyczką klikając przycisk poniżej.",
  "Rozpakuj archiwum ZIP w wybranym folderze na dysku.",
  "Otwórz Chrome i wejdź w chrome://extensions",
  "Włącz \"Tryb programisty\" (przełącznik w prawym górnym rogu).",
  "Kliknij \"Załaduj rozpakowane\" i wskaż folder z rozpakowaną wtyczką.",
  "Gotowe! Zaloguj się na play.autodarts.io — wtyczka zacznie działać automatycznie.",
];

const ExtensionDownloadSection = () => {
  const [showSteps, setShowSteps] = useState(false);

  return (
    <section className="rounded-xl border border-border bg-card p-6 md:p-8 card-glow">
      <div className="flex flex-col md:flex-row md:items-start gap-6">
        {/* Left side - info */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Chrome className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-foreground">Wtyczka Chrome</h2>
              <p className="text-sm text-muted-foreground font-body">eDART Polska – Autodarts Stats v1.5.0</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground font-body leading-relaxed">
            Rozszerzenie do przeglądarki Chrome, które łączy Twoje konto Autodarts z platformą eDART Polska.
            Automatycznie pobiera token, wykrywa Twój ID i przesyła wyniki meczów ligowych na żywo.
          </p>

          {/* Features grid */}
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

          {/* Download + Install toggle */}
          <div className="flex flex-wrap gap-3 pt-2">
            <a href="/chrome-extension" target="_blank" rel="noopener noreferrer" onClick={(e) => {
              e.preventDefault();
              // Download all extension files as individual links
              const files = ["manifest.json","background.js","content.js","inject-token.js","popup.html","popup.js","icon48.png","icon128.png"];
              files.forEach(f => {
                const a = document.createElement("a");
                a.href = `/chrome-extension/${f}`;
                a.download = f;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              });
            }}>
              <Button variant="hero" size="lg" className="gap-2">
                <Download className="h-4 w-4" /> Pobierz wtyczkę
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

      {/* Installation steps */}
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
                <span className="text-sm text-muted-foreground font-body pt-0.5">
                  {step.includes("chrome://extensions") ? (
                    <>
                      Otwórz Chrome i wejdź w{" "}
                      <code className="px-1.5 py-0.5 rounded bg-muted border border-border text-foreground text-xs font-mono">
                        chrome://extensions
                      </code>
                    </>
                  ) : (
                    step
                  )}
                </span>
              </li>
            ))}
          </ol>
        </motion.div>
      )}
    </section>
  );
};

export default ExtensionDownloadSection;
