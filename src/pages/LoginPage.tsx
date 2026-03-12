import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, UserPlus, KeyRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSelfHost } from "@/contexts/SelfHostContext";
import { lovable } from "@/integrations/lovable/index";

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
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result?.error) {
      toast({ title: "Błąd logowania Google", description: String(result.error), variant: "destructive" });
    }
    setGoogleLoading(false);
  };

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
      toast({ title: "Konto utworzone!", description: "Zostałeś automatycznie zalogowany." });
      navigate("/");
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

  // Show Google OAuth only when NOT self-hosted
  const showGoogleOAuth = !isSelfHosted;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <img src="/pwa-192x192.png" alt="eDART Polska" className="h-10 w-10 rounded-full" />
            <span className="font-display text-2xl tracking-wider text-foreground">
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
              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting}>
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

          {mode !== "forgot" && showGoogleOAuth && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground font-display tracking-wider">lub</span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {googleLoading ? "Łączenie..." : "Zaloguj się przez Google"}
              </Button>
            </>
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
