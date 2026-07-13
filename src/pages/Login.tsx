import { useState, FormEvent, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Lock, Mail, Sofa, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      const from = (location.state as { from?: string })?.from || "/";
      navigate(from, { replace: true });
    }
  }, [user, loading, location.state, navigate]);

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Welcome back");
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { display_name: displayName || email.split("@")[0] },
      },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Account created. You can sign in now.");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
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
          <p className="text-sm uppercase tracking-widest opacity-70 mb-4">AI-Powered Furniture Customization</p>
          <h1 className="font-display text-5xl xl:text-6xl font-bold leading-[1.05] mb-6">Transform Your<br />Design Vision.</h1>
          <p className="text-base opacity-80 leading-relaxed max-w-md">
            Sign in to upload furniture, apply premium materials, and place your pieces into any interior — in seconds.
          </p>
        </div>
        <div className="relative z-10 text-xs opacity-60">© {new Date().getFullYear()} LUSHbyGESIGN.</div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-primary-foreground/5" />
        <div className="absolute top-1/3 -right-16 w-64 h-64 rounded-full bg-primary-foreground/5" />
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center">
              <Sofa className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold">LUSH<span className="font-normal text-muted-foreground">by</span>GESIGN</span>
          </div>

          <div className="mb-6">
            <h2 className="font-display text-3xl lg:text-4xl font-bold mb-2">Welcome</h2>
            <p className="text-muted-foreground">Sign in or create an account to continue.</p>
          </div>

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-5">
                <EmailField email={email} setEmail={setEmail} />
                <PasswordField password={password} setPassword={setPassword} />
                <Button type="submit" disabled={busy} className="w-full h-11 text-base font-semibold rounded-lg">
                  {busy ? "Signing in..." : (<>Sign In<ArrowRight className="w-4 h-4 ml-2" /></>)}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name">Display name</Label>
                  <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Jane Designer" className="h-11" />
                </div>
                <EmailField email={email} setEmail={setEmail} />
                <PasswordField password={password} setPassword={setPassword} />
                <Button type="submit" disabled={busy} className="w-full h-11 text-base font-semibold rounded-lg">
                  {busy ? "Creating..." : "Create account"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  New accounts default to the <strong>user</strong> role. An admin can promote you.
                </p>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-8 text-xs text-center text-muted-foreground">
            By continuing you agree to the{" "}
            <Link to="/" className="underline hover:text-primary">Terms</Link> &{" "}
            <Link to="/" className="underline hover:text-primary">Privacy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

function EmailField({ email, setEmail }: { email: string; setEmail: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label htmlFor="email">Email</Label>
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="pl-10 h-11" required />
      </div>
    </div>
  );
}
function PasswordField({ password, setPassword }: { password: string; setPassword: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label htmlFor="password">Password</Label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-10 h-11" minLength={6} required />
      </div>
    </div>
  );
}
