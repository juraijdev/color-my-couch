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

    const prompt = `You are a professional interior design compositor. Your task is to seamlessly place the furniture from the FIRST image into the scene shown in the SECOND image (the background/room).

CRITICAL REQUIREMENTS:
1. FURNITURE PRESERVATION: The furniture from image 1 must appear EXACTLY as it is — same shape, same color, same material, same proportions, same design. Do NOT alter the furniture in ANY way.
2. NATURAL PLACEMENT: Place the furniture naturally in the background scene. It should look like it belongs there — correct perspective, correct scale relative to the room, sitting on the floor/surface properly.
3. LIGHTING MATCH: Adjust the furniture's lighting and shadows to match the ambient lighting of the background scene so it looks photorealistic and naturally integrated.
4. SHADOWS: Add natural shadows beneath and around the furniture to ground it in the scene.
5. PERSPECTIVE: Match the perspective/angle of the furniture to the room's vanishing points so it doesn't look pasted on.
6. SCALE: Size the furniture appropriately relative to the room — it should look like it actually fits in the space.
7. DO NOT modify or remove anything from the background scene — just add the furniture into it naturally.
8. The result should look like a professional interior design photograph.

Output a single photorealistic image of the furniture placed in the background scene.`;

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
