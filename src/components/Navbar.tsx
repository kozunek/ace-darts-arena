import { Link, useLocation } from "react-router-dom";
import { Menu, X, LogIn, LogOut, Shield, BarChart3, Settings, Handshake, Swords, Calendar, Trophy, Zap, MessageCircle, Megaphone, MoreHorizontal, ClipboardEdit, Target, Bug, Download, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItem = { label: string; href: string; icon: React.ReactElement; authOnly?: boolean; mobileOnly?: boolean };

const allNavItems: NavItem[] = [
  { label: "Strona główna", href: "/", icon: <Target className="h-3.5 w-3.5" /> },
  { label: "Tabele", href: "/tables", icon: <Trophy className="h-3.5 w-3.5" /> },
  { label: "Mecze", href: "/matches", icon: <Swords className="h-3.5 w-3.5" /> },
  { label: "Gracze", href: "/players", icon: <Trophy className="h-3.5 w-3.5" /> },
  { label: "Dodaj Wynik", href: "/submit", icon: <ClipboardEdit className="h-3.5 w-3.5" /> },
  { label: "Statystyki", href: "/stats", icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { label: "H2H", href: "/h2h", icon: <Swords className="h-3.5 w-3.5" /> },
  { label: "Kalendarz", href: "/calendar", icon: <Calendar className="h-3.5 w-3.5" /> },
  { label: "Rekordy", href: "/hall-of-fame", icon: <Trophy className="h-3.5 w-3.5" /> },
  { label: "Ogłoszenia", href: "/announcements", icon: <Megaphone className="h-3.5 w-3.5" /> },
  { label: "Jak grać?", href: "/how-to-play", icon: <Gamepad2 className="h-3.5 w-3.5" /> },
];

const extraNavItems: NavItem[] = [
  { label: "Moje Mecze", href: "/my-matches", icon: <Handshake className="h-3.5 w-3.5" />, authOnly: true },
  { label: "Osiągnięcia", href: "/achievements", icon: <Zap className="h-3.5 w-3.5" /> },
  { label: "Pobieranie", href: "/downloads", icon: <Download className="h-3.5 w-3.5" />, authOnly: true },
  { label: "Czat", href: "/chat", icon: <MessageCircle className="h-3.5 w-3.5" />, authOnly: true, mobileOnly: true },
  { label: "Zgłoś błąd", href: "/report-bug", icon: <Bug className="h-3.5 w-3.5" />, authOnly: true },
];

const allMobileItems: NavItem[] = [
  ...allNavItems,
  ...extraNavItems,
];

const Navbar = () => {
  const location = useLocation();
  const { user, profile, isAdmin, isModerator, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(allNavItems.length);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  const showAdminLink = isAdmin || isModerator;

  const calculateVisibleItems = useCallback(() => {
    const container = navContainerRef.current;
    if (!container) return;

    // Available width = container width minus space for "Więcej" button (~100px), user menu (~140px)
    const containerWidth = container.offsetWidth;
    const reservedWidth = 260; // więcej + user menu
    const availableWidth = containerWidth - reservedWidth;

    // Measure each item - approximate width per button
    const items = container.querySelectorAll('[data-nav-item]');
    let totalWidth = 0;
    let count = 0;

    for (let i = 0; i < allNavItems.length; i++) {
      const itemWidth = items[i] ? (items[i] as HTMLElement).offsetWidth + 2 : 80;
      if (totalWidth + itemWidth > availableWidth && i > 2) break; // always show at least 3
      totalWidth += itemWidth;
      count++;
    }

    setVisibleCount(count);
  }, []);

  useEffect(() => {
    // Initial measure with all items visible
    const timer = setTimeout(calculateVisibleItems, 100);
    
    const observer = new ResizeObserver(() => {
      calculateVisibleItems();
    });

    if (navContainerRef.current) {
      observer.observe(navContainerRef.current);
    }

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [calculateVisibleItems]);

  const visibleItems = allNavItems.slice(0, visibleCount);
  const overflowItems = allNavItems.slice(visibleCount);
  const allOverflowItems = [...overflowItems, ...extraNavItems];
  const isOverflowActive = allOverflowItems.some((item) => location.pathname === item.href);
  const isUserMenuActive = ["/my-matches", "/settings", "/admin"].includes(location.pathname);

  return (
    <nav className="sticky top-0 z-50 glass border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <img src="/pwa-192x192.png" alt="eDART Polska" className="h-7 w-7 rounded-full transition-transform group-hover:rotate-12" />
            <span className="font-display text-lg tracking-wider text-foreground">
              e<span className="text-primary">DART</span>
            </span>
          </Link>

          <div ref={navContainerRef} className="hidden lg:flex items-center gap-0.5 flex-1 ml-4 min-w-0">
            {allNavItems.map((item, index) => (
              <Link
                key={item.href}
                to={item.href}
                data-nav-item
                className={index >= visibleCount ? "invisible absolute" : ""}
              >
                <Button
                  variant={location.pathname === item.href ? "default" : "ghost"}
                  size="sm"
                  className="font-display uppercase tracking-wider text-[11px] h-8 px-2.5 whitespace-nowrap"
                >
                  {item.icon}
                  <span className="ml-1">{item.label}</span>
                </Button>
              </Link>
            ))}

            {allOverflowItems.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isOverflowActive ? "default" : "ghost"}
                    size="sm"
                    className="font-display uppercase tracking-wider text-[11px] h-8 px-2.5 shrink-0"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5 mr-1" />
                    Więcej{overflowItems.length > 0 && ` (${allOverflowItems.filter(i => !i.authOnly || user).length})`}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-48 max-h-80 overflow-y-auto">
                  {allOverflowItems.filter((item: any) => !item.authOnly || user).map((item) => (
                    <Link key={item.href} to={item.href}>
                      <DropdownMenuItem className={`font-display uppercase tracking-wider text-xs cursor-pointer ${location.pathname === item.href ? "bg-accent" : ""}`}>
                        {item.icon && <span className="mr-2">{item.icon}</span>}
                        {item.label}
                      </DropdownMenuItem>
                    </Link>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <div className="shrink-0 ml-auto">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={isUserMenuActive ? "default" : "ghost"}
                      size="sm"
                      className="font-display uppercase tracking-wider text-[11px] h-8 px-2.5"
                    >
                      <Settings className="h-3.5 w-3.5 mr-1" />
                      {profile?.name || "Profil"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <Link to="/settings">
                      <DropdownMenuItem className={`font-display uppercase tracking-wider text-xs cursor-pointer ${location.pathname === "/settings" ? "bg-accent" : ""}`}>
                        <Settings className="h-3.5 w-3.5 mr-2" /> Ustawienia
                      </DropdownMenuItem>
                    </Link>
                    {showAdminLink && (
                      <>
                        <DropdownMenuSeparator />
                        <Link to="/admin">
                          <DropdownMenuItem className={`font-display uppercase tracking-wider text-xs cursor-pointer ${location.pathname === "/admin" ? "bg-accent" : ""}`}>
                            <Shield className="h-3.5 w-3.5 mr-2" /> {isAdmin ? "Panel Admina" : "Panel Moderatora"}
                          </DropdownMenuItem>
                        </Link>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="font-display uppercase tracking-wider text-xs cursor-pointer text-destructive">
                      <LogOut className="h-3.5 w-3.5 mr-2" /> Wyloguj
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link to="/login">
                  <Button variant="outline" size="sm" className="font-display uppercase tracking-wider text-[11px] h-8 px-2.5">
                    <LogIn className="h-3.5 w-3.5 mr-1" /> Zaloguj
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {user && (
              <>
                <Link to="/my-matches">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Handshake className="h-4 w-4" />
                  </Button>
                </Link>
              </>
            )}
            <ThemeToggle />
            {user && <NotificationBell />}
            <button className="lg:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="lg:hidden pb-4 animate-fade-in max-h-[calc(100vh-3.5rem)] overflow-y-auto overscroll-contain">
            {allMobileItems.filter(item => !('authOnly' in item) || !item.authOnly || user).map((item) => (
              <Link key={item.href} to={item.href} onClick={() => setMobileOpen(false)}>
                <Button
                  variant={location.pathname === item.href ? "default" : "ghost"}
                  className="w-full justify-start font-display uppercase tracking-wider text-sm mb-1"
                >
                  {item.icon && <span className="mr-1">{item.icon}</span>}
                  {item.label}
                </Button>
              </Link>
            ))}
            {user && (
              <>
                <div className="my-2 border-t border-border" />
                <Link to="/settings" onClick={() => setMobileOpen(false)}>
                  <Button variant={location.pathname === "/settings" ? "default" : "ghost"} className="w-full justify-start font-display uppercase tracking-wider text-sm mb-1">
                    <Settings className="h-4 w-4 mr-1" /> Ustawienia
                  </Button>
                </Link>
                {showAdminLink && (
                  <Link to="/admin" onClick={() => setMobileOpen(false)}>
                    <Button variant={location.pathname === "/admin" ? "default" : "ghost"} className="w-full justify-start font-display uppercase tracking-wider text-sm mb-1">
                      <Shield className="h-4 w-4 mr-1" /> {isAdmin ? "Panel Admina" : "Panel Moderatora"}
                    </Button>
                  </Link>
                )}
                <Button variant="outline" onClick={() => { logout(); setMobileOpen(false); }} className="w-full justify-start font-display uppercase tracking-wider text-sm">
                  <LogOut className="h-4 w-4 mr-1" /> Wyloguj
                </Button>
              </>
            )}
            {!user && (
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
