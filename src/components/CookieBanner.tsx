import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";

const COOKIE_CONSENT_KEY = "edart_cookie_consent";

const CookieBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 animate-fade-in">
      <div className="container mx-auto max-w-2xl">
        <div className="rounded-lg border border-border bg-card p-4 shadow-lg flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Cookie className="h-5 w-5 text-primary shrink-0 mt-0.5 sm:mt-0" />
          <p className="text-sm text-muted-foreground font-body flex-1">
            Ta strona używa plików cookies wyłącznie w celach technicznych (utrzymanie sesji, uwierzytelnianie). Korzystając z serwisu, akceptujesz naszą{" "}
            <Link to="/privacy-policy" className="text-primary hover:underline">Politykę Prywatności</Link>.
          </p>
          <Button onClick={accept} size="sm" variant="hero" className="shrink-0 whitespace-nowrap">
            Rozumiem
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
