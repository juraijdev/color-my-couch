import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    console.log("Recolor request:", { 
      colorName: body.colorName, 
      colorHex: body.colorHex, 
      hasImage: !!body.image,
      selectedParts: body.selectedParts?.map((p: { name: string }) => p.name),
    })

    // Validate required fields
    if (!body.image || !body.colorName || !body.selectedParts || body.selectedParts.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: image, colorName, and selectedParts are required" 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Create a detailed prompt for image generation
    const partsList = body.selectedParts.map((p: { name: string; material: string }) => 
      `${p.name} (${p.material})`
    ).join(", ");
    
    const prompt = `Edit this furniture image: Change the color of ONLY these parts to ${body.colorName} (${body.colorHex}): ${partsList}. 
Keep everything else EXACTLY the same - same lighting, same angle, same background, same proportions.
The new color should look natural and realistic on the material.
Professional product photography quality.`;

    console.log("Generating recolored image with prompt:", prompt)

    // Use Lovable AI with image editing capabilities (Gemini with image generation)
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: body.image
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add more credits." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI generation failed: ${response.status}`);
    }

    const aiResult = await response.json();
    console.log("AI response received");

    // Extract the generated image from the response
    // Gemini image generation returns the image in the content
    const content = aiResult.choices?.[0]?.message?.content;
    
    // Check if there's an image in the response
    let imageUrl = null;
    if (typeof content === 'string') {
      // Try to find a base64 image or URL in the response
      const base64Match = content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
      if (base64Match) {
        imageUrl = base64Match[0];
      }
    } else if (Array.isArray(content)) {
      // Look for image content in array format
      for (const item of content) {
        if (item.type === 'image_url' || item.type === 'image') {
          imageUrl = item.image_url?.url || item.url;
          break;
        }
      }
    }

    // Check if the response has inline_data (Gemini format)
    const parts = aiResult.choices?.[0]?.message?.content;
    if (Array.isArray(parts)) {
      for (const part of parts) {
        if (part.inline_data?.data) {
          imageUrl = `data:${part.inline_data.mime_type || 'image/png'};base64,${part.inline_data.data}`;
          break;
        }
      }
    }

    if (!imageUrl) {
      console.log("Full AI response:", JSON.stringify(aiResult, null, 2));
      
      // Return a descriptive response if no image was generated
      return new Response(JSON.stringify({ 
        error: "Image generation not available. The AI analyzed your request but couldn't generate an image. Try using an external image editing tool.",
        analysis: content 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ 
      output: imageUrl,
      status: "succeeded" 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error in recolor-furniture function:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})