import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "user";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  role: Role | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  user: null, session: null, role: null, isAdmin: false, loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => loadRole(s.user.id), 0);
      } else {
        setRole(null);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) loadRole(data.session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const loadRole = async (userId: string) => {
    // 1) canonical source: user_roles table
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (!error && data && data.some((r) => r.role === "admin")) {
      setRole("admin");
      return;
    }
    if (error) console.warn("user_roles lookup failed:", error.message);

    // 2) fallback for self-hosted servers where user_roles is unreadable
    try {
      const { data: prof } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();
      if (prof && (prof as { role?: string }).role === "admin") {
        setRole("admin");
        return;
      }
    } catch {
      /* profiles table may not exist */
    }

    // 3) fallback: role stored on the auth user metadata
    const { data: userRes } = await supabase.auth.getUser();
    const meta = userRes?.user;
    const metaRole =
      (meta?.app_metadata as Record<string, unknown> | undefined)?.role ??
      (meta?.user_metadata as Record<string, unknown> | undefined)?.role;
    if (metaRole === "admin") {
      setRole("admin");
      return;
    }

    setRole("user");
  };


  return (
    <AuthContext.Provider value={{
      user, session, role,
      isAdmin: role === "admin",
      loading,
      signOut: async () => { await supabase.auth.signOut(); },
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
