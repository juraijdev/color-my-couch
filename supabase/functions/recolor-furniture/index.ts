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
    console.log("Request body:", { 
      colorName: body.colorName, 
      colorHex: body.colorHex, 
      hasImage: !!body.image,
      hasMask: !!body.mask,
      predictionId: body.predictionId
    })

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
    if (!body.image || !body.mask || !body.colorName || !body.colorHex) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: image, mask, colorName, and colorHex are required" 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Create a prompt for inpainting - only the masked area will be affected
    const prompt = `${body.colorName} colored furniture fabric, same material texture, ${body.colorHex} color, realistic lighting, high quality, professional product photo`

    console.log("Starting furniture inpainting with FLUX Fill Pro")
    console.log("Prompt:", prompt)

    // Use FLUX Fill Pro for inpainting - this model takes image + mask
    // and only modifies the masked area, leaving the rest completely untouched
    const prediction = await replicate.predictions.create({
      model: "black-forest-labs/flux-fill-pro",
      input: {
        image: body.image,
        mask: body.mask,
        prompt: prompt,
        steps: 50,
        guidance: 30,
        output_format: "png",
        safety_tolerance: 5
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
