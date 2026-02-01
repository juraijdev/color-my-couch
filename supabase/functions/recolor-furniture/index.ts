import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PatternAssignment {
  partName: string;
  partMaterial: string;
  patternName: string;
  patternDescription: string;
  patternImageUrl: string;
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
    console.log("Pattern application request:", { 
      hasImage: !!body.image,
      patternAssignments: body.patternAssignments?.map((p: PatternAssignment) => ({ 
        partName: p.partName, 
        patternName: p.patternName 
      })),
    })

    // Validate required fields
    if (!body.image || !body.patternAssignments || body.patternAssignments.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: image and patternAssignments are required" 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Build detailed prompt for multi-pattern application
    const assignments: PatternAssignment[] = body.patternAssignments;
    
    const patternChangesList = assignments.map((a: PatternAssignment) => 
      `- "${a.partName}" (${a.partMaterial}): Apply "${a.patternName}" - ${a.patternDescription}`
    ).join("\n");
    
    const prompt = `CRITICAL TASK: Recolor/retexture ONLY the specified furniture parts. The furniture shape, structure, and form must remain EXACTLY IDENTICAL.

PARTS TO RECOLOR:
${patternChangesList}

ABSOLUTE REQUIREMENTS - DO NOT VIOLATE:
1. SHAPE PRESERVATION: The furniture silhouette, contours, edges, and 3D form must be PIXEL-PERFECT identical to the input image
2. NO STRUCTURAL CHANGES: Do not add, remove, reshape, resize, or modify ANY part of the furniture structure
3. EXACT PROPORTIONS: All dimensions, angles, curves, and relationships between parts must stay exactly the same
4. BACKGROUND UNCHANGED: Keep the exact same background, shadows, reflections, and environment
5. LIGHTING UNCHANGED: Maintain the exact same lighting direction, intensity, and highlights
6. CAMERA ANGLE: Same perspective, no rotation, no zoom, no crop changes

MATERIAL APPLICATION RULES:
- Apply the new material/pattern ONLY as a color/texture overlay on the specified parts
- Match the material's color, grain direction, and surface texture from the reference images
- Preserve the original 3D shading and form - only change the surface appearance
- Natural lighting reflections should adapt to the new material properties
- Unspecified parts must remain COMPLETELY unchanged

Think of this as a "skin" change - the furniture body stays exactly the same, only the surface material appearance changes.`;

    console.log("Generating image with pattern application prompt:", prompt)

    // Build the message content with pattern reference images
    const messageContent: any[] = [
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
    ];

    // Add pattern reference images
    for (const assignment of assignments) {
      if (assignment.patternImageUrl) {
        messageContent.push({
          type: "text",
          text: `Reference for "${assignment.patternName}" finish to apply to "${assignment.partName}":`
        });
        messageContent.push({
          type: "image_url",
          image_url: {
            url: assignment.patternImageUrl
          }
        });
      }
    }

    // Use Lovable AI with image editing capabilities
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: messageContent
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
        error: "Image generation failed. The AI couldn't generate the customized image. Please try again.",
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
