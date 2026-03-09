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

const chromeSteps = [
  "Pobierz plik ZIP z wtyczką klikając przycisk poniżej.",
  "Rozpakuj archiwum ZIP w wybranym folderze na dysku.",
  "Otwórz Chrome i wejdź w chrome://extensions",
  "Włącz \"Tryb programisty\" (przełącznik w prawym górnym rogu).",
  "Kliknij \"Załaduj rozpakowane\" i wskaż folder z rozpakowaną wtyczką.",
  "Gotowe! Zaloguj się na play.autodarts.io — wtyczka zacznie działać automatycznie.",
];

const firefoxSteps = [
  "Pobierz plik ZIP z wtyczką klikając przycisk poniżej.",
  "Otwórz Firefox i wejdź w about:debugging#/runtime/this-firefox",
  "Kliknij \"Załaduj tymczasowy dodatek...\"",
  "Wskaż plik manifest.json z rozpakowanego folderu wtyczki.",
  "Gotowe! Zaloguj się na play.autodarts.io — wtyczka zacznie działać automatycznie.",
];

const FirefoxIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm5.64 5.643a7.856 7.856 0 0 1 .778 2.077c-.46-.702-1.209-.96-1.756-.99a4.088 4.088 0 0 0-1.197-2.127c-.043-.037-.087-.072-.131-.107.006.063.01.126.013.19.017.397-.07.994-.456 1.534-.523.732-1.207 1.063-1.591 1.478-.438.474-.66 1.07-.66 1.681 0 1.807 1.464 3.271 3.271 3.271.964 0 1.83-.417 2.43-1.08a7.902 7.902 0 0 1-4.38 4.92 7.88 7.88 0 0 1-3.96 1.06 7.912 7.912 0 0 1-5.96-2.71 7.342 7.342 0 0 1-.442-.58 7.883 7.883 0 0 1-1.122-2.87c.088.164.18.324.278.48a5.91 5.91 0 0 0 2.122 2.05c1.54.89 3.018.89 3.928.62-1.51-.48-2.528-1.71-2.628-3.16-.065-.96.28-1.85.88-2.71.28.65.83 1.12 1.5 1.26-.99-1.45-.56-3.36-.03-4.22.55-.9.72-1.89.67-2.6a7.907 7.907 0 0 1 4.437 1.747c.456-.173.96-.24 1.47-.16l.04.008c.11-.98-.34-1.99-.86-2.61A7.925 7.925 0 0 1 17.64 7.643z"/>
  </svg>
);

type BrowserTab = "chrome" | "firefox";

const ExtensionDownloadSection = () => {
  const [showSteps, setShowSteps] = useState(false);
  const [activeTab, setActiveTab] = useState<BrowserTab>("chrome");

  const downloadFiles = (browser: BrowserTab) => {
    const folder = browser === "chrome" ? "chrome-extension" : "firefox-extension";
    const files = browser === "chrome"
      ? ["manifest.json","background.js","content.js","inject-token.js","popup.html","popup.js","icon48.png","icon128.png"]
      : ["manifest.json","background.js","content.js","inject-token.js","popup.html","popup.js","icon48.png","icon128.png"];
    
    files.forEach(f => {
      const a = document.createElement("a");
      a.href = `/${folder}/${f}`;
      a.download = f;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  };

  const steps = activeTab === "chrome" ? chromeSteps : firefoxSteps;
  const debugUrl = activeTab === "chrome" ? "chrome://extensions" : "about:debugging#/runtime/this-firefox";

  return (
    <section className="rounded-xl border border-border bg-card p-6 md:p-8 card-glow">
      <div className="flex flex-col md:flex-row md:items-start gap-6">
        <div className="flex-1 space-y-4">
          {/* Browser tabs */}
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setActiveTab("chrome")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-display font-semibold transition-all ${
                activeTab === "chrome"
                  ? "bg-primary/10 border border-primary/30 text-primary"
                  : "bg-muted/30 border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Chrome className="h-4 w-4" />
              Chrome
            </button>
            <button
              onClick={() => setActiveTab("firefox")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-display font-semibold transition-all ${
                activeTab === "firefox"
                  ? "bg-[hsl(24,100%,50%)]/10 border border-[hsl(24,100%,50%)]/30 text-[hsl(24,100%,50%)]"
                  : "bg-muted/30 border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <FirefoxIcon />
              Firefox
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
              activeTab === "chrome"
                ? "bg-primary/10 border border-primary/20"
                : "bg-[hsl(24,100%,50%)]/10 border border-[hsl(24,100%,50%)]/20"
            }`}>
              {activeTab === "chrome" ? (
                <Chrome className="h-6 w-6 text-primary" />
              ) : (
                <span className="text-[hsl(24,100%,50%)]"><FirefoxIcon /></span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-foreground">
                Wtyczka {activeTab === "chrome" ? "Chrome" : "Firefox"}
              </h2>
              <p className="text-sm text-muted-foreground font-body">eDART Polska – Autodarts Stats v1.5.0</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground font-body leading-relaxed">
            Rozszerzenie do przeglądarki {activeTab === "chrome" ? "Google Chrome" : "Mozilla Firefox"}, które łączy Twoje konto Autodarts z platformą eDART Polska.
            Automatycznie pobiera token, wykrywa Twój ID i przesyła wyniki meczów ligowych na żywo.
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
            <Button
              variant="hero"
              size="lg"
              className="gap-2"
              onClick={() => downloadFiles(activeTab)}
            >
              <Download className="h-4 w-4" /> Pobierz wtyczkę ({activeTab === "chrome" ? "Chrome" : "Firefox"})
            </Button>
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
            Instrukcja instalacji ({activeTab === "chrome" ? "Chrome" : "Firefox"})
          </h3>
          <ol className="space-y-3">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-display font-bold text-primary">
                  {i + 1}
                </span>
                <span className="text-sm text-muted-foreground font-body pt-0.5">
                  {step.includes(debugUrl) ? (
                    <>
                      {step.split(debugUrl)[0]}
                      <code className="px-1.5 py-0.5 rounded bg-muted border border-border text-foreground text-xs font-mono">
                        {debugUrl}
                      </code>
                      {step.split(debugUrl)[1]}
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