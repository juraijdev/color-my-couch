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
   - **STAINLESS STEEL / METAL TRIM (SINGLE PART)**: Buffet tables and serving stations typically have stainless steel edges, trims, dividers between modules, AND a metal front edge/lip on the top surface. ALL of these metal elements — dividers, borders, front edge trim, side edge trim — must be grouped into ONE SINGLE PART called "Stainless Steel Trim & Edges". Do NOT create separate parts for each divider strip. They are all the same metal and will always be the same color.
   - **INDIVIDUAL TOP SURFACE MODULES**: If the top surface is divided into multiple sections/modules (e.g., 3 or 4 compartments on a buffet table), identify EACH module separately (e.g., "Top Module 1 - Left", "Top Module 2 - Center", "Top Module 3 - Right"). But the metal dividers BETWEEN them are part of the single "Stainless Steel Trim & Edges" part above.
   - **Frame / structural elements**: Legs, base frame, support bars
   - **Panels**: Side panels, back panels, door fronts
   - **Hardware**: Handles, knobs, hinges, casters/wheels
   - **Other materials**: Glass, fabric, leather, plastic components

2. METAL TRIM GROUPING RULE (CRITICAL):
   - ALL stainless steel / metal elements on the top surface must be ONE part: divider strips + front edge + side edges + border trim = ONE part
   - This single part covers every metallic strip, bezel, frame, lip, or edge on the top surface area
   - The user will assign ONE color/finish to all these metal elements together
   - Do NOT split dividers into "Divider 1", "Divider 2", etc. — they are ONE part

3. BE GRANULAR WITH TOP SURFACE MODULES (but not metal):
   - Identify each top module/compartment as a separate part (e.g., "Top Module 1 - Left", "Top Module 2 - Center", "Top Module 3 - Right")
   - But ALL metal trim/dividers/edges around and between modules = ONE single "Stainless Steel Trim & Edges" part

4. For each part, describe its approximate location as a percentage of the image (top/bottom/left/right)
5. Identify the current color/material of each part

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

IMPORTANT: Be thorough — identify 4-12 distinct selectable parts. Do NOT merge stainless steel edges into the wooden panels — metal is SEPARATE from wood. But DO merge ALL metal trim/dividers/edges into ONE single stainless steel part. Every top surface module is its own part, but all metal elements share one part.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this furniture image and identify ALL distinct parts that can be recolored. Pay SPECIAL ATTENTION to: (1) If this is a buffet table or serving station, identify EACH top surface module separately as its own part. (2) Group ALL stainless steel / metal elements (divider strips between modules, front edge of top surface, side edges, border trim) into ONE SINGLE part called 'Stainless Steel Trim & Edges' — do NOT create separate parts for each divider. (3) Identify every other material transition — wood panels, metal frames, handles, legs, wheels, side panels, etc. Return the JSON structure with all parts."
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