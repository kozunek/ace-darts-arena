import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, UserPlus, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const LoginPage = () => {
  const { toast } = useToast();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegister) {
      toast({
        title: "Rejestracja wysłana!",
        description: "Twoje konto czeka na zatwierdzenie przez administratora.",
      });
    } else {
      toast({
        title: "Zalogowano!",
        description: "Witaj w DartLiga.",
      });
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <Target className="h-10 w-10 text-primary" />
            <span className="font-display text-2xl tracking-wider text-foreground">
              DART<span className="text-primary">LIGA</span>
            </span>
          </Link>
          <h1 className="text-2xl font-display font-bold text-foreground">
            {isRegister ? "Rejestracja" : "Logowanie"}
          </h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            {isRegister ? "Załóż konto gracza" : "Zaloguj się do panelu gracza"}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 card-glow">
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="space-y-2">
                <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">
                  Imię i nazwisko
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jan Kowalski"
                  className="bg-muted/30 border-border"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jan@example.com"
                className="bg-muted/30 border-border"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">Hasło</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-muted/30 border-border"
                required
              />
            </div>

            <Button type="submit" variant="hero" size="lg" className="w-full">
              {isRegister ? <UserPlus className="h-4 w-4 mr-2" /> : <LogIn className="h-4 w-4 mr-2" />}
              {isRegister ? "Zarejestruj się" : "Zaloguj się"}
            </Button>
          </form>

          {isRegister && (
            <p className="text-xs text-muted-foreground text-center mt-4 font-body">
              Konto musi zostać zatwierdzone przez administratora przed pierwszym logowaniem.
            </p>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-sm text-primary hover:text-primary/80 font-body transition-colors"
            >
              {isRegister ? "Masz już konto? Zaloguj się" : "Nie masz konta? Zarejestruj się"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
