import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { LogIn, UserPlus, KeyRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSelfHost } from "@/contexts/SelfHostContext";


const LoginPage = () => {
  const { toast } = useToast();
  const { login, register, resetPassword, user, profile } = useAuth();
  const { isSelfHosted } = useSelfHost();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [gamingNick, setGamingNick] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  if (user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-md">
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">Jesteś zalogowany</h1>
        <p className="text-muted-foreground font-body mb-4">Witaj, {profile?.name || user.email}!</p>
        <div className="flex gap-3 justify-center">
          <Link to="/submit"><Button variant="hero">Dodaj wynik</Button></Link>
          <Link to="/settings"><Button variant="outline">Ustawienia</Button></Link>
        </div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await login(email, password);
    setSubmitting(false);
    if (error) {
      toast({ title: "Błąd logowania", description: error, variant: "destructive" });
    } else {
      toast({ title: "Zalogowano!", description: "Witaj w eDART Polska." });
      navigate("/");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      toast({ title: "Błąd", description: "Musisz zaakceptować regulamin i politykę prywatności.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Błąd", description: "Hasła nie są identyczne.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Błąd", description: "Hasło musi mieć minimum 6 znaków.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await register(name, email, password, gamingNick || undefined);
    setSubmitting(false);
    if (error) {
      toast({ title: "Błąd rejestracji", description: error, variant: "destructive" });
    } else {
      toast({ title: "Konto utworzone!", description: "Sprawdź swoją skrzynkę e-mail i kliknij link aktywacyjny, aby potwierdzić rejestrację." });
      setMode("login");
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await resetPassword(email);
    setSubmitting(false);
    if (error) {
      toast({ title: "Błąd", description: error, variant: "destructive" });
    } else {
      toast({ title: "Email wysłany!", description: "Sprawdź skrzynkę i kliknij link do resetowania hasła." });
      setMode("login");
    }
  };


  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-6">
            <img src="/favicon.png" alt="eDART Polska" className="h-10 w-10" />
            <span className="font-display text-2xl tracking-wider text-foreground uppercase">
              e<span className="text-primary">DART</span> <span className="text-sm text-primary">Polska</span>
            </span>
          </Link>
          <h1 className="text-2xl font-display font-bold text-foreground">
            {mode === "login" ? "Logowanie" : mode === "register" ? "Rejestracja" : "Resetowanie hasła"}
          </h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            {mode === "login" ? "Zaloguj się do panelu gracza" : mode === "register" ? "Załóż konto gracza" : "Podaj email aby zresetować hasło"}
          </p>
          {isSelfHosted && (
            <p className="text-xs text-primary mt-2 font-medium">🔧 Tryb self-host — logowanie przez własny serwer</p>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-6 card-glow">
          {mode === "forgot" ? (
            <form onSubmit={handleForgot} className="space-y-4">
              <div className="space-y-2">
                <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jan@example.com" className="bg-muted/30 border-border" required />
              </div>
              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting}>
                <KeyRound className="h-4 w-4 mr-2" />
                {submitting ? "Wysyłanie..." : "Wyślij link resetujący"}
              </Button>
            </form>
          ) : mode === "register" ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Nazwa użytkownika</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Jan Kowalski" className="bg-muted/30 border-border" required />
              </div>
              <div className="space-y-2">
                <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">
                  Nick w grze <span className="text-muted-foreground/60">(opcjonalny)</span>
                </Label>
                <Input value={gamingNick} onChange={(e) => setGamingNick(e.target.value)} placeholder="Nick z Autodarts / DartCounter / DartsMind" className="bg-muted/30 border-border" />
                <p className="text-[10px] text-muted-foreground">Jeśli twój nick różni się od nazwy, podaj go tutaj — ułatwi dopasowywanie wyników.</p>
              </div>
              <div className="space-y-2">
                <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jan@example.com" className="bg-muted/30 border-border" required />
              </div>
              <div className="space-y-2">
                <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Hasło</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 znaków" className="bg-muted/30 border-border" required />
              </div>
              <div className="space-y-2">
                <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Powtórz hasło</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Powtórz hasło" className="bg-muted/30 border-border" required />
              </div>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(v) => setAcceptedTerms(v === true)}
                  className="mt-0.5"
                />
                <label htmlFor="terms" className="text-xs text-muted-foreground font-body leading-tight cursor-pointer">
                  Akceptuję{" "}
                  <Link to="/terms" className="text-primary hover:underline" target="_blank">Regulamin</Link>
                  {" "}oraz{" "}
                  <Link to="/privacy-policy" className="text-primary hover:underline" target="_blank">Politykę Prywatności</Link>
                </label>
              </div>
              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting || !acceptedTerms}>
                <UserPlus className="h-4 w-4 mr-2" />
                {submitting ? "Rejestracja..." : "Zarejestruj się"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jan@example.com" className="bg-muted/30 border-border" required />
              </div>
              <div className="space-y-2">
                <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Hasło</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="bg-muted/30 border-border" required />
              </div>
              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting}>
                <LogIn className="h-4 w-4 mr-2" />
                {submitting ? "Logowanie..." : "Zaloguj się"}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center space-y-2">
            {mode === "login" && (
              <>
                <button onClick={() => setMode("forgot")} className="text-sm text-primary hover:text-primary/80 font-body transition-colors block mx-auto">
                  Zapomniałeś hasła?
                </button>
                <button onClick={() => setMode("register")} className="text-sm text-primary hover:text-primary/80 font-body transition-colors block mx-auto">
                  Nie masz konta? Zarejestruj się
                </button>
              </>
            )}
            {mode === "register" && (
              <button onClick={() => setMode("login")} className="text-sm text-primary hover:text-primary/80 font-body transition-colors">
                Masz już konto? Zaloguj się
              </button>
            )}
            {mode === "forgot" && (
              <button onClick={() => setMode("login")} className="text-sm text-primary hover:text-primary/80 font-body transition-colors">
                Wróć do logowania
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
