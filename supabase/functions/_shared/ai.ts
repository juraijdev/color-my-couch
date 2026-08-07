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

type AiMessageContent = Array<
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
>;

interface GenerateImageOptions {
  model: string;
  messageContent: AiMessageContent;
  temperature?: number;
  logLabel?: string;
}

interface GenerateImageResult {
  output?: string;
  model?: string;
  status?: number;
  error?: string;
}

// Map Lovable-style model ids to Google's native model ids when we're going
// direct to Gemini. Anything Lovable-exclusive (e.g. gemini-3 previews) falls
// back to the closest public Gemini equivalent.
// Use "-latest" aliases so we automatically follow Google's current stable
// model for each family instead of pinning to a version they may deprecate
// (e.g. gemini-2.5-flash was retired for new API keys).
const GEMINI_MODEL_MAP: Record<string, string> = {
  "google/gemini-3-pro-image": "gemini-3-pro-image-preview",
  "google/gemini-3.1-flash-image": "gemini-3.1-flash-image-preview",
  "google/gemini-3-pro-image-preview": "gemini-2.5-flash-image",
  "google/gemini-3.1-flash-image-preview": "gemini-2.5-flash-image",
  "google/gemini-2.5-flash-image": "gemini-2.5-flash-image",
  "google/gemini-2.5-flash": "gemini-flash-latest",
  "google/gemini-2.5-flash-lite": "gemini-flash-lite-latest",
  "google/gemini-2.5-pro": "gemini-pro-latest",
  "google/gemini-3-flash-preview": "gemini-flash-latest",
  "google/gemini-3.5-flash": "gemini-flash-latest",
  "google/gemini-3.1-flash-lite": "gemini-flash-lite-latest",
  "google/gemini-3.1-pro-preview": "gemini-pro-latest",
  "google/gemini-3.6-flash": "gemini-flash-latest",
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
        "Lovable-API-Key": lovableKey,
        "Content-Type": "application/json",
      },
      mapModel: (m: string) => m,
      provider: "lovable",
    };
  }
  throw new Error("No AI key is visible to the backend function runtime. Set GEMINI_API_KEY in the backend .env and pass it into the functions container, or set LOVABLE_API_KEY.");
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function imageUrlToGeminiInlinePart(url: string) {
  const dataUrlMatch = url.match(/^data:([^;]+);base64,(.+)$/);
  if (dataUrlMatch) {
    return {
      inlineData: {
        mimeType: dataUrlMatch[1],
        data: dataUrlMatch[2],
      },
    };
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to load image reference: ${response.status}`);
  }
  const contentType = response.headers.get("content-type")?.split(";")[0] || "image/png";
  return {
    inlineData: {
      mimeType: contentType,
      data: arrayBufferToBase64(await response.arrayBuffer()),
    },
  };
}

async function buildGeminiParts(messageContent: AiMessageContent) {
  const parts = [];
  for (const item of messageContent) {
    if (item.type === "text") {
      parts.push({ text: item.text });
    } else if (item.type === "image_url") {
      parts.push(await imageUrlToGeminiInlinePart(item.image_url.url));
    }
  }
  return parts;
}

async function generateImageWithLovable(
  cfg: AiConfig,
  { model, messageContent, temperature, logLabel }: GenerateImageOptions,
): Promise<GenerateImageResult> {
  const mapped = cfg.mapModel(model);
  console.log(`Trying ${logLabel || "image model"}: ${model} -> ${mapped}`);

  let last: GenerateImageResult = { error: "No image returned", model };
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, [1200, 3000, 6000][attempt - 1]));
    try {
      const response = await fetch(cfg.url, {
        method: "POST",
        headers: cfg.headers,
        body: JSON.stringify({
          model: mapped,
          ...(typeof temperature === "number" ? { temperature } : {}),
          messages: [{ role: "user", content: messageContent }],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`AI gateway image attempt ${attempt + 1} failed:`, model, response.status, errorText);
        last = { status: response.status, error: errorText, model };
        if (![408, 429, 500, 502, 503, 504].includes(response.status)) return last;
        continue;
      }

      const aiResult = await response.json();
      const choice = aiResult.choices?.[0];
      const message = choice?.message;
      const imageUrl = message?.images?.[0]?.image_url?.url || message?.images?.[0]?.url;

      console.log("AI image response structure:", JSON.stringify({
        model,
        hasChoices: !!aiResult.choices,
        choicesLength: aiResult.choices?.length,
        hasChoiceError: !!choice?.error,
        choiceError: choice?.error?.message,
        hasImages: !!message?.images,
        imagesLength: message?.images?.length,
      }));

      if (imageUrl) return { output: imageUrl, model };
      last = { error: choice?.error?.message || message?.content || message?.reasoning || "No image returned", model };
    } catch (error) {
      last = { status: 503, error: error instanceof Error ? error.message : "AI connection failed", model };
      console.error(`AI gateway image attempt ${attempt + 1} network error:`, model, error);
    }
  }
  return last;
}

// Google retires image model ids without notice (a working id can start
// returning 400/404 overnight). Always try a chain of known-good image model
// ids instead of a single pinned name.
const GEMINI_NATIVE_IMAGE_FALLBACKS = [
  "gemini-3-pro-image-preview",
  "gemini-3-flash-image-preview",
  "gemini-2.5-flash-image",
  "gemini-2.5-flash-image-preview",
  "gemini-2.0-flash-preview-image-generation",
];

async function callGeminiNativeImage(
  geminiKey: string,
  mapped: string,
  parts: unknown[],
  temperature?: number,
): Promise<GenerateImageResult> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${mapped}:generateContent?key=${encodeURIComponent(geminiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          ...(typeof temperature === "number" ? { temperature } : {}),
          responseModalities: ["TEXT", "IMAGE"],
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Native Gemini image error:", mapped, response.status, errorText);
    return { status: response.status, error: errorText, model: mapped };
  }

  const aiResult = await response.json();
  const responseParts = aiResult.candidates?.[0]?.content?.parts || [];
  const imagePart = responseParts.find((part: any) => part.inlineData?.data || part.inline_data?.data);
  const inlineData = imagePart?.inlineData || imagePart?.inline_data;

  console.log("Native Gemini image response structure:", JSON.stringify({
    mapped,
    candidatesLength: aiResult.candidates?.length,
    partsLength: responseParts.length,
    hasImage: !!inlineData?.data,
    finishReason: aiResult.candidates?.[0]?.finishReason,
    promptFeedback: aiResult.promptFeedback,
  }));

  if (inlineData?.data) {
    const mimeType = inlineData.mimeType || inlineData.mime_type || "image/png";
    return { output: `data:${mimeType};base64,${inlineData.data}`, model: mapped };
  }

  const textDetails = responseParts.map((part: any) => part.text).filter(Boolean).join("\n");
  return { error: textDetails || JSON.stringify(aiResult).slice(0, 1500), model: mapped };
}

async function generateImageWithGeminiNative(
  cfg: AiConfig,
  { model, messageContent, temperature, logLabel }: GenerateImageOptions,
): Promise<GenerateImageResult> {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) return { error: "GEMINI_API_KEY is not configured" };

  const mapped = cfg.mapModel(model);
  const candidates = [mapped, ...GEMINI_NATIVE_IMAGE_FALLBACKS].filter(
    (id, index, all) => all.indexOf(id) === index,
  );

  const parts = await buildGeminiParts(messageContent);
  let last: GenerateImageResult = { error: "No image returned", model };

  // Two passes: Google's image models regularly return transient 500/503 when
  // overloaded, which is why a retry usually succeeds. Only truly missing ids
  // (404/400) are skipped permanently.
  const deadIds = new Set<string>();

  for (let attempt = 0; attempt < 4; attempt++) {
    for (const candidate of candidates) {
      if (deadIds.has(candidate)) continue;
      console.log(`Trying ${logLabel || "native Gemini image model"}: ${model} -> ${candidate} (attempt ${attempt + 1})`);
      const result = await callGeminiNativeImage(geminiKey, candidate, parts, temperature);
      if (result.output) return result;

      last = result;
      // Quota / auth problems will not be fixed by another model id or a retry.
      if (result.status === 429 || result.status === 401 || result.status === 403) return result;
      // Model id does not exist for this key/region - never try it again.
      if (result.status === 404 || result.status === 400) deadIds.add(candidate);
    }
    if (deadIds.size === candidates.length) break;
    // Back off before retrying transiently-failing ids (1s, 3s, 6s).
    await new Promise((resolve) => setTimeout(resolve, [1000, 3000, 6000][attempt]));
  }

  return last;
}


export async function generateImageFromMessages(options: GenerateImageOptions): Promise<GenerateImageResult> {
  const cfg = getAiConfig();
  if (cfg.provider === "gemini") {
    return generateImageWithGeminiNative(cfg, options);
  }
  return generateImageWithLovable(cfg, options);
}
