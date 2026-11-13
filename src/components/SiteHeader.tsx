import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Shield, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MAIN_CATEGORIES } from "@/lib/furnitureCategories";

import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

export function SiteHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();

  const initial = (user?.email?.[0] ?? "?").toUpperCase();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3 sm:h-16 sm:flex-nowrap sm:px-6 sm:py-0">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">L</span>
          </div>
          <span className="font-display text-xl font-bold tracking-normal text-foreground">
            LUSH<span className="font-normal text-muted-foreground">by</span>GESIGN
          </span>
        </Link>

        <nav className="flex w-full flex-wrap items-center gap-x-4 gap-y-3 sm:w-auto sm:gap-6">
          <Link to="/" className={cn("text-sm font-medium hover:text-primary transition-colors",
            location.pathname === "/" ? "text-primary" : "text-muted-foreground")}>
            Home
          </Link>
          <Link to="/customize" className={cn("text-sm font-medium transition-colors",
            location.pathname === "/customize"
              ? "text-primary-foreground bg-primary px-4 py-2 rounded-lg"
              : "text-muted-foreground hover:text-primary")}>
            Transform Your Design
          </Link>
          {isAdmin && (
            <Link to="/admin" className={cn("text-sm font-medium flex items-center gap-1.5 hover:text-primary transition-colors",
              location.pathname.startsWith("/admin") ? "text-primary" : "text-muted-foreground")}>
              <Shield className="w-4 h-4" /> Admin
            </Link>
          )}
          {isAdmin && (
            <Button
              variant="ghost" size="icon"
              onClick={() => navigate("/admin?tab=chat")}
              title="AI Assistant Chat"
            >
              <MessageSquare className="w-4 h-4" />
            </Button>
          )}

          <LanguageSwitcher />



          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" aria-label="Account menu" className="h-9 w-9 shrink-0 rounded-full font-semibold text-sm">
                  {initial}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="text-xs text-muted-foreground font-normal">Signed in as</div>
                  <div className="truncate">{user.email}</div>
                  <div className="text-xs mt-1 text-primary">{isAdmin ? "Admin" : "User"}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => { await signOut(); navigate("/login"); }}>
                  <LogOut className="w-4 h-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>
      </div>

      <div className="border-t border-border bg-muted/30">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-2 px-4 py-2 sm:flex-nowrap sm:px-6 sm:overflow-x-auto">
          <span className="text-xs uppercase tracking-wider text-muted-foreground w-full shrink-0 mr-1 sm:w-auto">
            Saved library
          </span>
          {MAIN_CATEGORIES.map((m) => (
            <Button
              key={m}
              variant="outline"
              size="sm"
              className="h-7 text-xs shrink-0"
              onClick={() => navigate(`/customize?library=${encodeURIComponent(m)}&t=${Date.now()}`)}
            >
              {m}
            </Button>
          ))}
        </div>
      </div>
    </header>
  );
}
