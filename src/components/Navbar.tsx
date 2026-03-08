import { Link, useLocation } from "react-router-dom";
import { Target, Menu, X, LogIn, LogOut, Shield, BarChart3, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { label: "Tabela Ligi", href: "/" },
  { label: "Mecze", href: "/matches" },
  { label: "Gracze", href: "/players" },
  { label: "Statystyki", href: "/stats", icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { label: "Dodaj Wynik", href: "/submit" },
];

const Navbar = () => {
  const location = useLocation();
  const { user, profile, isAdmin, logout } = useAuth();
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

          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.href} to={item.href}>
                <Button
                  variant={location.pathname === item.href ? "default" : "ghost"}
                  size="sm"
                  className="font-display uppercase tracking-wider text-xs"
                >
                  {item.icon && item.icon}
                  {item.label}
                </Button>
              </Link>
            ))}
            {isAdmin && (
              <Link to="/admin">
                <Button
                  variant={location.pathname === "/admin" ? "default" : "ghost"}
                  size="sm"
                  className="font-display uppercase tracking-wider text-xs"
                >
                  <Shield className="h-3.5 w-3.5 mr-1" /> Admin
                </Button>
              </Link>
            )}
            {user ? (
              <div className="flex items-center gap-2 ml-2">
                <Link to="/settings">
                  <Button variant="ghost" size="sm" className="font-display uppercase tracking-wider text-xs">
                    <Settings className="h-3.5 w-3.5 mr-1" /> {profile?.name || user.email}
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={logout} className="font-display uppercase tracking-wider text-xs">
                  <LogOut className="h-4 w-4 mr-1" /> Wyloguj
                </Button>
              </div>
            ) : (
              <Link to="/login">
                <Button variant="outline" size="sm" className="ml-2 font-display uppercase tracking-wider text-xs">
                  <LogIn className="h-4 w-4 mr-1" /> Zaloguj
                </Button>
              </Link>
            )}
          </div>

          <button className="md:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden pb-4 animate-fade-in">
            {navItems.map((item) => (
              <Link key={item.href} to={item.href} onClick={() => setMobileOpen(false)}>
                <Button
                  variant={location.pathname === item.href ? "default" : "ghost"}
                  className="w-full justify-start font-display uppercase tracking-wider text-sm mb-1"
                >
                  {item.icon && item.icon}
                  {item.label}
                </Button>
              </Link>
            ))}
            {isAdmin && (
              <Link to="/admin" onClick={() => setMobileOpen(false)}>
                <Button variant={location.pathname === "/admin" ? "default" : "ghost"} className="w-full justify-start font-display uppercase tracking-wider text-sm mb-1">
                  <Shield className="h-4 w-4 mr-1" /> Admin
                </Button>
              </Link>
            )}
            {user ? (
              <>
                <Link to="/settings" onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start font-display uppercase tracking-wider text-sm mb-1">
                    <Settings className="h-4 w-4 mr-1" /> Ustawienia
                  </Button>
                </Link>
                <Button variant="outline" onClick={() => { logout(); setMobileOpen(false); }} className="w-full justify-start font-display uppercase tracking-wider text-sm">
                  <LogOut className="h-4 w-4 mr-1" /> Wyloguj
                </Button>
              </>
            ) : (
              <Link to="/login" onClick={() => setMobileOpen(false)}>
                <Button variant="outline" className="w-full justify-start font-display uppercase tracking-wider text-sm">
                  <LogIn className="h-4 w-4 mr-1" /> Zaloguj
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
