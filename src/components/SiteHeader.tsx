import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Shield, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
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
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">L</span>
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-foreground">
            LUSH<span className="font-normal text-muted-foreground">by</span>GESIGN
          </span>
        </Link>

        <nav className="flex items-center gap-6">
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

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-9 h-9 rounded-full bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center hover:opacity-90">
                  {initial}
                </button>
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
    </header>
  );
}
