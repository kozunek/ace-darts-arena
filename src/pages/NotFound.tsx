import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <img src="/favicon.png" alt="eDART Polska" className="h-16 w-16 mx-auto mb-4" />
        <h1 className="mb-4 text-4xl font-display font-bold text-foreground">404</h1>
        <p className="mb-4 text-xl text-muted-foreground font-body">Strona nie znaleziona</p>
        <a href="/" className="text-primary underline hover:text-primary/90 font-body">
          Wróć na stronę główną
        </a>
      </div>
    </div>
  );
};

export default NotFound;
