import { useState, FormEvent } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Lock, User, Sofa, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { signIn, isAuthenticated } from "@/lib/auth";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated()) {
    const from = (location.state as { from?: string })?.from || "/";
    return <div className="hidden" ref={() => navigate(from, { replace: true })} />;
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      if (signIn(username, password)) {
        toast.success("Welcome back");
        const from = (location.state as { from?: string })?.from || "/";
        navigate(from, { replace: true });
      } else {
        toast.error("Invalid credentials");
      }
      setLoading(false);
    }, 250);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-primary text-primary-foreground p-12 relative overflow-hidden">
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-md bg-primary-foreground/10 backdrop-blur flex items-center justify-center border border-primary-foreground/20">
            <Sofa className="w-5 h-5" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">
            LUSH<span className="font-normal opacity-70">by</span>GESIGN
          </span>
        </div>

        <div className="relative z-10">
          <p className="text-sm uppercase tracking-widest opacity-70 mb-4">
            AI-Powered Furniture Customization
          </p>
          <h1 className="font-display text-5xl xl:text-6xl font-bold leading-[1.05] mb-6">
            Transform Your<br />Design Vision.
          </h1>
          <p className="text-base opacity-80 leading-relaxed max-w-md">
            Sign in to upload furniture, apply premium materials, and place your pieces
            into any interior — all in seconds.
          </p>
        </div>

        <div className="relative z-10 text-xs opacity-60">
          © {new Date().getFullYear()} LUSHbyGESIGN. All rights reserved.
        </div>

        {/* Decorative circles */}
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-primary-foreground/5" />
        <div className="absolute top-1/3 -right-16 w-64 h-64 rounded-full bg-primary-foreground/5" />
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center">
              <Sofa className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold">
              LUSH<span className="font-normal text-muted-foreground">by</span>GESIGN
            </span>
          </div>

          <div className="mb-8">
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-2">
              Welcome back
            </h2>
            <p className="text-muted-foreground">
              Sign in to access your design workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 text-base font-semibold rounded-lg"
            >
              {loading ? "Signing in..." : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 p-4 rounded-lg border border-border bg-muted/40">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Demo Credentials
            </p>
            <div className="text-sm font-mono text-foreground space-y-1">
              <div>Username: <span className="text-primary font-semibold">admin</span></div>
              <div>Password: <span className="text-primary font-semibold">lush2026</span></div>
            </div>
          </div>

          <p className="mt-8 text-xs text-center text-muted-foreground">
            By signing in you agree to the{" "}
            <Link to="/" className="underline hover:text-primary">Terms</Link> &{" "}
            <Link to="/" className="underline hover:text-primary">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
