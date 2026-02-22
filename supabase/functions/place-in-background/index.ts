import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not set')
    }

    const body = await req.json()
    console.log("Place in background request:", {
      hasFurnitureImage: !!body.furnitureImage,
      hasBackgroundImage: !!body.backgroundImage,
    })

    if (!body.furnitureImage || !body.backgroundImage) {
      return new Response(
        JSON.stringify({ error: "Both furnitureImage and backgroundImage are required" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const prompt = `You are a professional interior design compositor. Your ONLY task is to take the EXACT furniture from image 1 and place it into the room/scene in image 2.

ABSOLUTE IRON-CLAD RULES — VIOLATION IS UNACCEPTABLE:

1. PIXEL-PERFECT FURNITURE PRESERVATION: The furniture must appear EXACTLY as it is in image 1. IDENTICAL shape, silhouette, outline, contours, edges, curves, angles, proportions, dimensions, color, material, texture, pattern, grain, and every single visual detail. Do NOT redraw, reimagine, regenerate, or artistically interpret the furniture. It must be a direct copy-paste of the furniture — not a recreation.

2. ZERO MODIFICATIONS TO FURNITURE: Do NOT change, add, remove, reshape, resize, stretch, compress, rotate the form of, recolor, retexture, smooth, sharpen, stylize, or alter the furniture in ANY way whatsoever. Every leg, panel, handle, shelf, joint, corner, curve, and surface must be IDENTICAL to image 1. The colors, materials, textures, and finishes must remain EXACTLY as they are — do NOT alter them even slightly.

3. NO ARTISTIC INTERPRETATION OF FURNITURE: Do NOT "improve" the furniture, change its style, modernize it, simplify it, add details, remove details, or make ANY creative modifications to the furniture itself. The furniture is a fixed, immutable object.

4. PROPORTION MATCHING (CRITICAL): Look at the OTHER furniture and objects already present in the background scene (image 2). Your placed furniture MUST be scaled to match the real-world proportions of those existing objects. If there are chairs, tables, sofas, or other furniture in the background, use them as scale references. The placed furniture should look like it physically belongs in that space at a realistic size — not too large, not too small compared to surrounding objects, doors, windows, and walls.

5. PLACEMENT RULES: Place the furniture naturally in the background scene with:
   - Correct scale relative to the room AND relative to other furniture/objects already in the scene
   - Proper grounding on the floor/surface
   - Natural shadows beneath and around the furniture to anchor it in the scene
   - Lighting on the furniture adjusted to match the ambient lighting direction and color temperature of the room

6. BACKGROUND PRESERVATION: Do NOT modify, remove, or rearrange anything in the background scene. Only ADD the furniture into it.

7. COLOR & DESIGN PRESERVATION: The furniture's colors, materials, textures, patterns, and finishes from image 1 must be preserved EXACTLY in the output. Do NOT change any color, do NOT change any material appearance. The only adjustments allowed are lighting/shadow integration with the environment.

8. The result should look like a professional interior design photograph where the furniture was physically placed in the room and photographed.

THINK OF IT THIS WAY: You are cutting out the EXACT furniture from photo 1 with perfect precision and pasting it into photo 2, then adding realistic shadows and lighting adjustments so it looks naturally placed. The furniture pixels themselves do not change — only their lighting/shadow integration with the new environment. Scale it to match other objects in the room.

Output a single photorealistic image.`;

    const messageContent = [
      { type: "text", text: prompt },
      { type: "text", text: "FURNITURE IMAGE (place this into the background):" },
      { type: "image_url", image_url: { url: body.furnitureImage } },
      { type: "text", text: "BACKGROUND/ROOM IMAGE (place furniture into this scene):" },
      { type: "image_url", image_url: { url: body.backgroundImage } },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [{ role: "user", content: messageContent }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add more credits." }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI generation failed: ${response.status}`);
    }

    const aiResult = await response.json();
    console.log("AI response structure:", JSON.stringify({
      hasChoices: !!aiResult.choices,
      choicesLength: aiResult.choices?.length,
      hasImages: !!aiResult.choices?.[0]?.message?.images,
      imagesLength: aiResult.choices?.[0]?.message?.images?.length,
    }));

    const message = aiResult.choices?.[0]?.message;
    let imageUrl = null;

    if (message?.images && Array.isArray(message.images) && message.images.length > 0) {
      const firstImage = message.images[0];
      imageUrl = firstImage.image_url?.url || firstImage.url;
      console.log("Found composited image in response");
    }

    if (!imageUrl) {
      console.log("No image found in response:", JSON.stringify(aiResult, null, 2).substring(0, 2000));
      return new Response(JSON.stringify({
        error: "Failed to place furniture in background. Please try again.",
        details: message?.content || "No content returned",
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      });
    }

    return new Response(JSON.stringify({ output: imageUrl, status: "succeeded" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });
  } catch (error) {
    console.error("Error in place-in-background function:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    })
  }
})
