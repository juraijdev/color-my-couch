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
    console.log("Analyze request:", { 
      hasImage: !!body.image,
      clickX: body.clickX,
      clickY: body.clickY,
      imageWidth: body.imageWidth,
      imageHeight: body.imageHeight,
    })

    if (!body.image) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required field: image is required" 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Use Lovable AI with vision to analyze the clicked region
    // and identify what part of the furniture was clicked
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert furniture analyst specializing in commercial and hospitality furniture, particularly buffet tables, serving stations, and display units.

CRITICAL ANALYSIS RULES:

1. IDENTIFY EVERY DISTINCT MATERIAL ZONE: Look carefully at the furniture and identify ALL distinct parts based on material, finish, and function. Pay extremely close attention to:
   - **STAINLESS STEEL EDGES / TRIM / BORDERS**: Buffet tables and serving stations typically have stainless steel edges, trims, or borders between modules/sections on the top surface. These MUST be identified as separate parts. Look for thin metallic strips, bezels, or frames that separate or border the top surface modules.
   - **INDIVIDUAL TOP SURFACE MODULES**: If the top surface is divided into multiple sections/modules (e.g., 3 or 4 compartments on a buffet table), identify EACH module separately AND the stainless steel trim/edges between them.
   - **Frame / structural elements**: Legs, base frame, support bars
   - **Panels**: Side panels, back panels, door fronts
   - **Hardware**: Handles, knobs, hinges, casters/wheels
   - **Other materials**: Glass, fabric, leather, plastic components

2. BE GRANULAR WITH TOP SURFACES: For buffet tables and similar furniture:
   - Identify each top module/compartment as a separate part (e.g., "Top Module 1 - Left", "Top Module 2 - Center", "Top Module 3 - Right")
   - Identify ALL stainless steel edges, borders, and trim pieces as separate parts (e.g., "Stainless Steel Edge Trim", "Module Divider Strips")
   - If there are different materials on the top (wood panels + metal borders), each gets its own part

3. For each part, describe its approximate location as a percentage of the image (top/bottom/left/right)
4. Identify the current color/material of each part

Return your analysis as JSON with this exact structure:
{
  "parts": [
    {
      "id": "unique_id",
      "name": "Human readable name like 'Top Module 1 - Left Panel'",
      "description": "Brief description including material details",
      "material": "wood|metal|fabric|leather|glass|plastic|stainless_steel|other",
      "currentColor": "approximate current color like 'brushed silver' or 'dark brown'",
      "location": {
        "top": 0-100,
        "left": 0-100,
        "width": 0-100,
        "height": 0-100
      }
    }
  ]
}

IMPORTANT: Be thorough — identify 4-12 distinct selectable parts. Do NOT merge stainless steel edges into the wooden panels. They are SEPARATE parts. Every visible material transition boundary should result in a separate part entry.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this furniture image and identify ALL distinct parts that can be recolored. Pay SPECIAL ATTENTION to: (1) If this is a buffet table or serving station, identify EACH top surface module separately AND the stainless steel edges/trim/dividers between modules as their own parts. (2) Identify every material transition — wood panels, metal frames, stainless steel borders, handles, legs, wheels, etc. Return the JSON structure with all parts."
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
        max_tokens: 2000,
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
      
      throw new Error("AI analysis failed");
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";
    
    console.log("AI response:", content);

    // Parse the JSON from the AI response
    let parts = [];
    try {
      // Extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        parts = parsed.parts || [];
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Return a default structure if parsing fails
      parts = [
        { id: "main", name: "Main Body", description: "The main furniture body", material: "wood", currentColor: "brown" }
      ];
    }

    return new Response(JSON.stringify({ parts }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error("Error in segment-furniture function:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})