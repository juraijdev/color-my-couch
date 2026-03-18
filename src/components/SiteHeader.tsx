import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">L</span>
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-foreground">
            LUSH<span className="font-normal text-muted-foreground">by</span>GESIGN
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-8">
          <Link
            to="/"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              location.pathname === "/" ? "text-primary" : "text-muted-foreground"
            )}
          >
            Home
          </Link>
          <Link
            to="/customize"
            className={cn(
              "text-sm font-medium transition-colors",
              location.pathname === "/customize"
                ? "text-primary-foreground bg-primary px-4 py-2 rounded-lg"
                : "text-muted-foreground hover:text-primary"
            )}
          >
            Transform Your Design
          </Link>
        </nav>
      </div>
    </header>
  );
}
