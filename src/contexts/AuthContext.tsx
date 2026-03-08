import { createContext, useContext, useState, ReactNode } from "react";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => boolean;
  register: (name: string, email: string, password: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Demo accounts for testing
const DEMO_ACCOUNTS: (AuthUser & { password: string })[] = [
  { id: "1", name: "Krzysztof Nowak", email: "admin@dartliga.pl", password: "admin123", isAdmin: true },
  { id: "2", name: "Anna Wiśniewska", email: "anna@dartliga.pl", password: "anna123", isAdmin: false },
  { id: "3", name: "Tomasz Kowalski", email: "tomasz@dartliga.pl", password: "tomasz123", isAdmin: false },
  { id: "4", name: "Magdalena Zielińska", email: "magda@dartliga.pl", password: "magda123", isAdmin: false },
  { id: "5", name: "Piotr Kamiński", email: "piotr@dartliga.pl", password: "piotr123", isAdmin: false },
  { id: "6", name: "Ewa Dąbrowska", email: "ewa@dartliga.pl", password: "ewa123", isAdmin: false },
];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [pendingUsers, setPendingUsers] = useState<{ name: string; email: string }[]>([]);

  const login = (email: string, password: string): boolean => {
    const found = DEMO_ACCOUNTS.find((a) => a.email === email && a.password === password);
    if (found) {
      setUser({ id: found.id, name: found.name, email: found.email, isAdmin: found.isAdmin });
      return true;
    }
    return false;
  };

  const register = (name: string, email: string, _password: string) => {
    setPendingUsers((prev) => [...prev, { name, email }]);
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
