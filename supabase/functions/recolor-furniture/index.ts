import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Replicate from "https://esm.sh/replicate@0.25.2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const REPLICATE_API_KEY = Deno.env.get('REPLICATE_API_KEY')
    if (!REPLICATE_API_KEY) {
      throw new Error('REPLICATE_API_KEY is not set')
    }

    const replicate = new Replicate({
      auth: REPLICATE_API_KEY,
    })

    const body = await req.json()
    console.log("Request body:", { colorName: body.colorName, colorHex: body.colorHex, hasImage: !!body.image })

    // Check prediction status
    if (body.predictionId) {
      console.log("Checking status for prediction:", body.predictionId)
      const prediction = await replicate.predictions.get(body.predictionId)
      console.log("Status check response:", prediction.status)
      return new Response(JSON.stringify(prediction), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate required fields
    if (!body.image || !body.colorName || !body.colorHex) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: image, colorName, and colorHex are required" 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Create a detailed prompt for furniture recoloring
    const prompt = `Change the color of the furniture in this image to ${body.colorName} (${body.colorHex}). Only change the furniture color, keep the background, shadows, textures, and all other elements exactly the same. Maintain the realistic lighting and material properties of the furniture. The furniture should have the new ${body.colorName} color applied naturally.`

    console.log("Starting furniture recolor with prompt:", prompt)

    // Use flux-kontext-pro for intelligent image editing
    // This model understands context and can selectively edit parts of an image
    const prediction = await replicate.predictions.create({
      model: "black-forest-labs/flux-kontext-pro",
      input: {
        prompt: prompt,
        image_url: body.image,
        aspect_ratio: "match_input_image",
        output_format: "png",
        safety_tolerance: 5,
        prompt_upsampling: false
      }
    })

    console.log("Prediction created:", prediction.id, prediction.status)

    return new Response(JSON.stringify(prediction), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error("Error in recolor-furniture function:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
