import { Link, useLocation } from "react-router-dom";
import { Target, Menu, X, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const navItems = [
  { label: "Tabela Ligi", href: "/" },
  { label: "Mecze", href: "/matches" },
  { label: "Gracze", href: "/players" },
  { label: "Dodaj Wynik", href: "/submit" },
];

const Navbar = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 glass border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <Target className="h-8 w-8 text-primary transition-transform group-hover:rotate-45" />
            <span className="font-display text-xl tracking-wider text-foreground">
              DART<span className="text-primary">LIGA</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.href} to={item.href}>
                <Button
                  variant={location.pathname === item.href ? "default" : "ghost"}
                  size="sm"
                  className="font-display uppercase tracking-wider text-xs"
                >
                  {item.label}
                </Button>
              </Link>
            ))}
            <Link to="/login">
              <Button variant="outline" size="sm" className="ml-2 font-display uppercase tracking-wider text-xs">
                <LogIn className="h-4 w-4 mr-1" />
                Zaloguj
              </Button>
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden text-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden pb-4 animate-fade-in">
            {navItems.map((item) => (
              <Link key={item.href} to={item.href} onClick={() => setMobileOpen(false)}>
                <Button
                  variant={location.pathname === item.href ? "default" : "ghost"}
                  className="w-full justify-start font-display uppercase tracking-wider text-sm mb-1"
                >
                  {item.label}
                </Button>
              </Link>
            ))}
            <Link to="/login" onClick={() => setMobileOpen(false)}>
              <Button variant="outline" className="w-full justify-start font-display uppercase tracking-wider text-sm">
                <LogIn className="h-4 w-4 mr-1" />
                Zaloguj
              </Button>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
