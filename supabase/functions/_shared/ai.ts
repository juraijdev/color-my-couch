// Shared AI gateway helper.
// - If GEMINI_API_KEY is set (self-hosted VPS), calls Google Gemini via its
//   OpenAI-compatible endpoint directly.
// - Otherwise falls back to the Lovable AI Gateway using LOVABLE_API_KEY.
//
// Same request/response shape (OpenAI /v1/chat/completions) in both cases,
// so callers can just do:
//   const cfg = getAiConfig();
//   const res = await fetch(cfg.url, {
//     method: "POST",
//     headers: cfg.headers,
//     body: JSON.stringify({ ...body, model: cfg.mapModel(body.model) }),
//   });

export interface AiConfig {
  url: string;
  headers: Record<string, string>;
  mapModel: (model: string) => string;
  provider: "gemini" | "lovable";
}

// Map Lovable-style model ids to Google's native model ids when we're going
// direct to Gemini. Anything Lovable-exclusive (e.g. gemini-3 previews) falls
// back to the closest public Gemini equivalent.
const GEMINI_MODEL_MAP: Record<string, string> = {
  "google/gemini-3-pro-image-preview": "gemini-2.5-flash-image-preview",
  "google/gemini-3.1-flash-image-preview": "gemini-2.5-flash-image-preview",
  "google/gemini-2.5-flash-image": "gemini-2.5-flash-image-preview",
  "google/gemini-2.5-flash": "gemini-2.5-flash",
  "google/gemini-2.5-flash-lite": "gemini-2.5-flash-lite",
  "google/gemini-2.5-pro": "gemini-2.5-pro",
  "google/gemini-3-flash-preview": "gemini-2.5-flash",
  "google/gemini-3.5-flash": "gemini-2.5-flash",
  "google/gemini-3.1-flash-lite": "gemini-2.5-flash-lite",
  "google/gemini-3.1-pro-preview": "gemini-2.5-pro",
};

export function getAiConfig(): AiConfig {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (geminiKey) {
    return {
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      headers: {
        Authorization: `Bearer ${geminiKey}`,
        "Content-Type": "application/json",
      },
      mapModel: (m: string) => GEMINI_MODEL_MAP[m] ?? m.replace(/^google\//, ""),
      provider: "gemini",
    };
  }
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (lovableKey) {
    return {
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      mapModel: (m: string) => m,
      provider: "lovable",
    };
  }
  throw new Error("No AI key configured. Set GEMINI_API_KEY (self-hosted) or LOVABLE_API_KEY.");
}
