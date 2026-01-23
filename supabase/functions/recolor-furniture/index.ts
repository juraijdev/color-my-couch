import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ColorAssignment {
  partName: string;
  partMaterial: string;
  colorName: string;
  colorHex: string;
}

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
      hasImage: !!body.image,
      colorAssignments: body.colorAssignments,
    })

    // Validate required fields
    if (!body.image || !body.colorAssignments || body.colorAssignments.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: image and colorAssignments are required" 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Build detailed prompt for multi-color recoloring
    const assignments: ColorAssignment[] = body.colorAssignments;
    
    const colorChangesList = assignments.map((a: ColorAssignment) => 
      `- Change the "${a.partName}" (${a.partMaterial}) to ${a.colorName} (${a.colorHex})`
    ).join("\n");
    
    const prompt = `Edit this furniture image with the following color changes:

${colorChangesList}

IMPORTANT INSTRUCTIONS:
- Apply EACH color change to its specific part as listed above
- Keep everything else EXACTLY the same - same lighting, same angle, same background, same proportions
- Each part should have its own distinct new color as specified
- The new colors should look natural and realistic on each material type
- Maintain professional product photography quality
- Do NOT change any parts that are not listed above`;

    console.log("Generating recolored image with prompt:", prompt)

    // Use Lovable AI with image editing capabilities
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
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
        modalities: ["image", "text"]
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
    console.log("AI response structure:", JSON.stringify({
      hasChoices: !!aiResult.choices,
      choicesLength: aiResult.choices?.length,
      hasImages: !!aiResult.choices?.[0]?.message?.images,
      imagesLength: aiResult.choices?.[0]?.message?.images?.length
    }));

    // Extract the generated image from the response
    const message = aiResult.choices?.[0]?.message;
    let imageUrl = null;
    
    if (message?.images && Array.isArray(message.images) && message.images.length > 0) {
      const firstImage = message.images[0];
      imageUrl = firstImage.image_url?.url || firstImage.url;
      console.log("Found image in images array");
    }

    if (!imageUrl) {
      console.log("No image found in response. Full response:", JSON.stringify(aiResult, null, 2).substring(0, 2000));
      
      return new Response(JSON.stringify({ 
        error: "Image generation failed. The AI couldn't generate a recolored image. Please try again.",
        details: message?.content || "No content returned"
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
