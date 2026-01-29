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
      `- Apply "${a.patternName}" finish to the "${a.partName}" (${a.partMaterial}): ${a.patternDescription}`
    ).join("\n");
    
    const prompt = `Edit this furniture image by applying the following material/finish changes:

${patternChangesList}

IMPORTANT INSTRUCTIONS:
- Apply EACH material/finish change to its specific part as listed above
- The new materials should look like brushed/hairline stainless steel with the specified plating
- Maintain the metallic brushed texture appearance with fine vertical hairlines
- Keep everything else EXACTLY the same - same lighting, same angle, same background, same proportions
- Each part should have its own distinct new finish as specified
- The new finishes should look natural and realistic, matching professional stainless steel finishes
- Maintain professional product photography quality
- Do NOT change any parts that are not listed above
- Preserve the 3D form and reflections appropriate for metal surfaces`;

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
