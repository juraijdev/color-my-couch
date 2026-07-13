// Deprecated helpers kept for backwards compatibility.
// Use `useAuth()` from `@/hooks/useAuth` instead.
import { supabase } from "@/integrations/supabase/client";

export async function signOut() {
  await supabase.auth.signOut();
}
