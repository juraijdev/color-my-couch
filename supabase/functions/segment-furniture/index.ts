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
    console.log("Segment request:", { 
      hasImage: !!body.image,
      pointsCount: body.points?.length,
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
    if (!body.image || !body.points || body.points.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: image and points are required" 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    console.log("Starting segmentation with SAM-2")
    console.log("Points:", body.points)

    // Use lucataco/segment-anything-2 which supports point prompts
    // Format: points as [[x1,y1], [x2,y2], ...] and labels as [1, 1, ...] (1 = foreground)
    const pointCoords = body.points.map((p: { x: number, y: number }) => [p.x, p.y])
    const pointLabels = body.points.map(() => 1) // All foreground points

    const prediction = await replicate.predictions.create({
      model: "meta/sam-2",
      input: {
        image: body.image,
        point_coords: pointCoords,
        point_labels: pointLabels,
        multimask_output: false, // Get single best mask
      }
    })

    console.log("Prediction created:", prediction.id, prediction.status)

    return new Response(JSON.stringify(prediction), {
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
