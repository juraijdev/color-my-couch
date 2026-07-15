// Admin-only AI assistant chat.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getAiConfig } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ChatMsg { role: "user" | "assistant" | "system"; content: string }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    // Verify admin role
    const { data: roles } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = roles?.some((r: { role: string }) => r.role === "admin");
    if (!isAdmin) return json({ error: "Admins only" }, 403);

    const { messages } = await req.json() as { messages: ChatMsg[] };
    if (!Array.isArray(messages)) return json({ error: "messages[] required" }, 400);

    let aiCfg;
    try { aiCfg = getAiConfig(); }
    catch (e) { return json({ error: (e as Error).message }, 500); }

    const started = Date.now();
    const upstream = await fetch(aiCfg.url, {
      method: "POST",
      headers: aiCfg.headers,
      body: JSON.stringify({
        model: aiCfg.mapModel("google/gemini-2.5-flash"),
        messages: [
          { role: "system", content: "You are the AI assistant for LUSHbyGESIGN admin. Help the admin diagnose furniture customization issues, explain how the AI recolor pipeline works (part segmentation, pattern assignment, shape preservation), and suggest fixes. Be concise." },
          ...messages,
        ],
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return json({ error: `AI gateway: ${upstream.status} ${text}` }, upstream.status === 429 || upstream.status === 402 ? upstream.status : 500);
    }

    const data = await upstream.json();
    const reply = data?.choices?.[0]?.message?.content ?? "";
    const duration = Date.now() - started;

    // log usage (best-effort)
    try {
      const service = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await service.from("ai_usage_log").insert({
        user_id: user.id, feature: "admin-chat",
        model: "google/gemini-2.5-flash", status: "success", duration_ms: duration,
      });
    } catch (_) { /* ignore */ }

    return json({ reply });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
