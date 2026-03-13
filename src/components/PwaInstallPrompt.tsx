import { useState, useEffect } from "react";
import { X, Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const PWA_DISMISSED_KEY = "pwa_install_dismissed";
const PWA_INSTALLED_KEY = "pwa_installed";

const PwaInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed or installed
    if (localStorage.getItem(PWA_DISMISSED_KEY) || localStorage.getItem(PWA_INSTALLED_KEY)) return;

    // Check if running as standalone (already installed)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      localStorage.setItem(PWA_INSTALLED_KEY, "true");
      return;
    }

    // iOS detection (no beforeinstallprompt on Safari)
    const ua = navigator.userAgent;
    const isIosDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    if (isIosDevice) {
      setIsIos(true);
      // Show after 3 seconds on iOS
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }

    // Android / Desktop Chrome
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show after 3 seconds
      setTimeout(() => setShow(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Listen for successful install
    window.addEventListener("appinstalled", () => {
      localStorage.setItem(PWA_INSTALLED_KEY, "true");
      setShow(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        localStorage.setItem(PWA_INSTALLED_KEY, "true");
      }
      setDeferredPrompt(null);
      setShow(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(PWA_DISMISSED_KEY, Date.now().toString());
    setShow(false);
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-4 left-4 right-4 z-[60] mx-auto max-w-md"
      >
        <div className="relative rounded-xl border border-border bg-card p-4 shadow-2xl card-glow">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0 pr-4">
              <h3 className="text-sm font-display font-bold text-foreground">
                Zainstaluj eDART Polska
              </h3>
              <p className="text-xs text-muted-foreground font-body mt-0.5">
                {isIos
                  ? 'Kliknij ikonę "Udostępnij" ⬆ a potem "Dodaj do ekranu głównego"'
                  : "Dodaj aplikację do ekranu głównego — szybki dostęp do wyników i statystyk."}
              </p>
            </div>
          </div>

          {!isIos && (
            <div className="flex gap-2 mt-3">
              <Button
                variant="hero"
                size="sm"
                className="flex-1 gap-1.5 text-xs"
                onClick={handleInstall}
              >
                <Download className="h-3.5 w-3.5" />
                Zainstaluj
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={handleDismiss}
              >
                Nie teraz
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PwaInstallPrompt;