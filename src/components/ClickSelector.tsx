import { useState, useRef, useImperativeHandle, forwardRef, useEffect } from "react";
import { MousePointer2, Plus, Trash2, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface ClickSelectorRef {
  getMaskDataUrl: () => string | null;
  hasMask: () => boolean;
  clearSelection: () => void;
}

interface ClickPoint {
  x: number;
  y: number;
  normalizedX: number;
  normalizedY: number;
}

interface ClickSelectorProps {
  imageUrl: string;
  selectedColor: string | null;
  onSelectionChange?: (hasSelection: boolean) => void;
}

export const ClickSelector = forwardRef<ClickSelectorRef, ClickSelectorProps>(
  ({ imageUrl, selectedColor, onSelectionChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const [clickPoints, setClickPoints] = useState<ClickPoint[]>([]);
    const [maskUrl, setMaskUrl] = useState<string | null>(null);
    const [isSegmenting, setIsSegmenting] = useState(false);
    const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0, naturalWidth: 0, naturalHeight: 0 });

    // Update dimensions when image loads
    const handleImageLoad = () => {
      if (imageRef.current) {
        setImageDimensions({
          width: imageRef.current.clientWidth,
          height: imageRef.current.clientHeight,
          naturalWidth: imageRef.current.naturalWidth,
          naturalHeight: imageRef.current.naturalHeight,
        });
      }
    };

    // Reset on new image
    useEffect(() => {
      setClickPoints([]);
      setMaskUrl(null);
      onSelectionChange?.(false);
    }, [imageUrl, onSelectionChange]);

    // Handle click on image
    const handleImageClick = async (e: React.MouseEvent<HTMLDivElement>) => {
      if (!imageRef.current || isSegmenting) return;

      const rect = imageRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Calculate normalized coordinates (0-1) for the actual image dimensions
      const normalizedX = (x / imageDimensions.width) * imageDimensions.naturalWidth;
      const normalizedY = (y / imageDimensions.height) * imageDimensions.naturalHeight;

      const newPoint: ClickPoint = { x, y, normalizedX, normalizedY };
      const newPoints = [...clickPoints, newPoint];
      setClickPoints(newPoints);

      // Trigger segmentation
      await segmentWithPoints(newPoints);
    };

    const segmentWithPoints = async (points: ClickPoint[]) => {
      if (points.length === 0) return;

      setIsSegmenting(true);
      try {
        // Send points to SAM-2 for segmentation
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/segment-furniture`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              image: imageUrl,
              points: points.map(p => ({ x: Math.round(p.normalizedX), y: Math.round(p.normalizedY) })),
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to start segmentation");
        }

        const prediction = await response.json();
        console.log("Segmentation started:", prediction.id);

        // Poll for completion
        let result = prediction;
        while (result.status !== "succeeded" && result.status !== "failed") {
          await new Promise((resolve) => setTimeout(resolve, 1500));

          const statusResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/segment-furniture`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({ predictionId: prediction.id }),
            }
          );

          if (!statusResponse.ok) {
            throw new Error("Failed to check segmentation status");
          }

          result = await statusResponse.json();
          console.log("Segmentation status:", result.status);
        }

        if (result.status === "failed") {
          throw new Error(result.error || "Segmentation failed");
        }

        // Get the mask from output
        // SAM-2 returns combined_mask or individual_masks
        const outputMask = result.output?.combined_mask || 
                          (Array.isArray(result.output?.individual_masks) ? result.output.individual_masks[0] : null) ||
                          (Array.isArray(result.output) ? result.output[0] : result.output);

        if (outputMask) {
          setMaskUrl(outputMask);
          onSelectionChange?.(true);
          toast.success("Part selected! Click more areas to add to selection.");
        } else {
          throw new Error("No mask returned from segmentation");
        }
      } catch (error) {
        console.error("Segmentation error:", error);
        toast.error(error instanceof Error ? error.message : "Failed to segment. Try clicking again.");
        // Remove the failed point
        setClickPoints(points.slice(0, -1));
      } finally {
        setIsSegmenting(false);
      }
    };

    const handleClear = () => {
      setClickPoints([]);
      setMaskUrl(null);
      onSelectionChange?.(false);
      toast.info("Selection cleared");
    };

    const handleRemoveLastPoint = () => {
      if (clickPoints.length === 0) return;
      const newPoints = clickPoints.slice(0, -1);
      setClickPoints(newPoints);
      if (newPoints.length === 0) {
        setMaskUrl(null);
        onSelectionChange?.(false);
      } else {
        segmentWithPoints(newPoints);
      }
    };

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      getMaskDataUrl: () => maskUrl,
      hasMask: () => !!maskUrl && clickPoints.length > 0,
      clearSelection: handleClear,
    }));

    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center gap-4">
        {/* Toolbar */}
        <div className="flex items-center gap-4 p-2 bg-card/80 backdrop-blur rounded-lg border border-border">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-md">
            <MousePointer2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Click to Select Parts</span>
          </div>
          
          <div className="h-6 w-px bg-border" />
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {clickPoints.length} point{clickPoints.length !== 1 ? "s" : ""} selected
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRemoveLastPoint}
            disabled={clickPoints.length === 0 || isSegmenting}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Undo
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={clickPoints.length === 0 || isSegmenting}
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Clear All
          </Button>
        </div>

        {/* Image container with click handling */}
        <div
          ref={containerRef}
          className="relative max-w-full overflow-hidden rounded-lg shadow-2xl cursor-crosshair"
          onClick={handleImageClick}
        >
          {/* Background image */}
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Furniture to recolor"
            className="block max-w-full max-h-[500px] object-contain"
            onLoad={handleImageLoad}
            draggable={false}
          />

          {/* Mask overlay */}
          {maskUrl && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `url(${maskUrl})`,
                backgroundSize: "100% 100%",
                mixBlendMode: "multiply",
                opacity: 0.5,
              }}
            />
          )}

          {/* Selection overlay with color tint */}
          {maskUrl && selectedColor && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                maskImage: `url(${maskUrl})`,
                WebkitMaskImage: `url(${maskUrl})`,
                maskSize: "100% 100%",
                WebkitMaskSize: "100% 100%",
                backgroundColor: selectedColor === "white" ? "#f0f0f0" : selectedColor,
                opacity: 0.3,
              }}
            />
          )}

          {/* Click point markers */}
          {clickPoints.map((point, index) => (
            <div
              key={index}
              className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: point.x, top: point.y }}
            >
              <div className="w-full h-full rounded-full bg-primary border-2 border-white shadow-lg flex items-center justify-center">
                <Plus className="w-3 h-3 text-primary-foreground" />
              </div>
            </div>
          ))}

          {/* Loading overlay */}
          {isSegmenting && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <span className="text-sm font-medium">Analyzing...</span>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="text-center text-sm text-muted-foreground max-w-md">
          <p>
            {clickPoints.length === 0 ? (
              <>Click on any furniture part to select it. The AI will automatically detect the full region.</>
            ) : selectedColor ? (
              <>Click more parts to add to selection, then generate to apply <strong>{selectedColor}</strong> color.</>
            ) : (
              <>Select a color from the palette, then click "Generate Design" to recolor the selected parts.</>
            )}
          </p>
        </div>
      </div>
    );
  }
);

ClickSelector.displayName = "ClickSelector";
