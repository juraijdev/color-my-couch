// One-off seed: creates fixed admin + user accounts. Idempotent.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const seeds = [
    { email: "admin@lushbygesign.tech", password: "LushAdmin2026!", role: "admin", name: "Admin" },
    { email: "designer@lushbygesign.tech", password: "LushUser2026!", role: "user", name: "Designer" },
  ];

  const results: any[] = [];
  for (const s of seeds) {
    // Try create; if exists, fetch by listing
    let userId: string | null = null;
    const { data: created, error } = await admin.auth.admin.createUser({
      email: s.email,
      password: s.password,
      email_confirm: true,
      user_metadata: { display_name: s.name },
    });
    if (created?.user) {
      userId = created.user.id;
    } else {
      // find existing
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const found = list?.users.find((u) => u.email === s.email);
      if (found) {
        userId = found.id;
        await admin.auth.admin.updateUserById(found.id, { password: s.password, email_confirm: true });
      }
    }
    if (!userId) { results.push({ email: s.email, error: error?.message ?? "unknown" }); continue; }

    // Ensure profile
    await admin.from("profiles").upsert({ id: userId, email: s.email, display_name: s.name });

    // Ensure exactly the desired role
    await admin.from("user_roles").delete().eq("user_id", userId);
    await admin.from("user_roles").insert({ user_id: userId, role: s.role });

    results.push({ email: s.email, id: userId, role: s.role });
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
