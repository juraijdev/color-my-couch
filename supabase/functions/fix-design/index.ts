import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { generateImageFromMessages, getAiConfig } from "../_shared/ai.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type AiMessageContent = Array<
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
>;

interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

// Improve an already-generated design based on free-text user feedback.
// This function NEVER redesigns the furniture: it only corrects what the
// user describes (color, finish, background cleanliness, or restoring the
// original shape where a previous generation deviated).
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    getAiConfig();

    const body = await req.json()
    const currentImage: string | undefined = body.image;
    const originalImage: string | undefined = body.originalImage;
    const feedback: string | undefined = body.feedback;
    const history: ChatTurn[] = Array.isArray(body.history) ? body.history.slice(-6) : [];

    if (!currentImage || typeof currentImage !== "string") {
      return new Response(JSON.stringify({ error: "Missing required field: image" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    if (!feedback || typeof feedback !== "string" || feedback.trim().length < 3) {
      return new Response(JSON.stringify({ error: "Please describe what to fix (at least a few words)." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    if (feedback.length > 1000) {
      return new Response(JSON.stringify({ error: "Feedback is too long. Please keep it under 1000 characters." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const historyText = history.length > 0
      ? `\nPREVIOUS FEEDBACK IN THIS SESSION (already addressed — do not undo those fixes):\n${history.map((h) => `- ${h.role === "user" ? "User" : "AI"}: ${h.text}`).join("\n")}\n`
      : "";

    const prompt = `You are a precision photo-retouching assistant. The user has a customized furniture design image and reported a problem with it. Your job: return an improved version of the SAME image that fixes ONLY what the user describes.

USER'S REPORTED ISSUE:
"${feedback.trim()}"
${historyText}
⚠️ STRICT CORRECTION RULES ⚠️
1. FIX ONLY WHAT WAS REPORTED: Change only the thing the user complained about (a color, a finish, a background area, a misplaced detail, a shape deviation). Every other pixel of the image must remain identical to the input.
2. NEVER REDESIGN: Do not change the furniture model, style, proportions, camera angle, framing, or composition. Do not add or remove any part, leg, panel, handle, trim, divider, or decoration.
3. SHAPE ISSUES: If the user says the shape/structure looks wrong, RESTORE the exact silhouette and structure from the original reference photo (provided below) — never invent a new shape.
4. COLOR/FINISH ISSUES: If a color or material looks wrong, repaint only the affected existing part pixels with the corrected finish the user describes. Keep crisp boundaries between parts, no bleed or halo.
5. BACKGROUND ISSUES: If the user complains about the background, clean it to a pure solid white (#ffffff) outside the furniture silhouette, with no shadows, gradients, or leftover room pixels — unless the user explicitly asks for something else.
6. KEEP IT REAL: The result must look like the same real product photograph, only corrected. No artistic reinterpretation, no style change, no added effects.

Return exactly one corrected image. Do not answer with text only.`;

    const messageContent: AiMessageContent = [
      { type: "text", text: prompt },
      {
        type: "text",
        text: "CURRENT DESIGN TO FIX — edit this exact image in place. Keep everything the user did NOT complain about pixel-identical.",
      },
      { type: "image_url", image_url: { url: currentImage } },
    ];

    if (originalImage && typeof originalImage === "string") {
      messageContent.push({
        type: "text",
        text: "ORIGINAL REFERENCE PHOTO — the ground truth for the furniture's true shape, silhouette, part count, and structure. If the current design deviated from this, restore this exact geometry. Do not copy its colors if the user intentionally changed them.",
      });
      messageContent.push({ type: "image_url", image_url: { url: originalImage } });
    }

    messageContent.push({
      type: "text",
      text: "FINAL CHECK BEFORE RETURNING: confirm you changed ONLY what the user reported, the furniture shape and camera view are unchanged (or restored to the original reference), and no new parts or details appeared.",
    });

    const models = [
      "google/gemini-3-pro-image",
      "google/gemini-3.1-flash-image",
    ];

    let lastDetails = "No content returned";
    let output: string | undefined;

    for (const model of models) {
      const result = await generateImageFromMessages({
        model,
        messageContent,
        temperature: 0.1,
        logLabel: "fix-design image model",
      });

      if (result.output) {
        output = result.output;
        console.log("fix-design succeeded with", model);
        break;
      }

      if (result.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (result.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add more credits." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (result.error) lastDetails = result.error;
    }

    if (!output) {
      console.log("fix-design: no image returned:", lastDetails);
      return new Response(JSON.stringify({
        error: "The AI couldn't improve the design this time. Please try rephrasing the issue or try again.",
        details: lastDetails,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ output, status: "succeeded" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error in fix-design function:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
