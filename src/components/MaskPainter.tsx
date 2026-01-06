import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import { Canvas as FabricCanvas, PencilBrush } from "fabric";
import { Paintbrush, Eraser, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

export interface MaskPainterRef {
  getMaskDataUrl: () => string | null;
  hasMask: () => boolean;
}

interface MaskPainterProps {
  imageUrl: string;
  selectedColor: string | null;
}

export const MaskPainter = forwardRef<MaskPainterRef, MaskPainterProps>(
  ({ imageUrl, selectedColor }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
    const [tool, setTool] = useState<"brush" | "eraser">("brush");
    const [brushSize, setBrushSize] = useState(30);
    const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

    // Load image and setup canvas
    useEffect(() => {
      if (!canvasRef.current || !containerRef.current) return;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const containerWidth = containerRef.current?.clientWidth || 800;
        const maxHeight = 500;

        // Calculate scaled dimensions to fit container
        let width = img.width;
        let height = img.height;
        const aspectRatio = width / height;

        if (width > containerWidth) {
          width = containerWidth;
          height = width / aspectRatio;
        }
        if (height > maxHeight) {
          height = maxHeight;
          width = height * aspectRatio;
        }

        setImageDimensions({ width, height });

        const canvas = new FabricCanvas(canvasRef.current!, {
          width,
          height,
          isDrawingMode: true,
          backgroundColor: "transparent",
        });

        // Setup brush
        const brush = new PencilBrush(canvas);
        brush.color = "rgba(255, 0, 0, 0.5)"; // Semi-transparent red for visibility
        brush.width = brushSize;
        canvas.freeDrawingBrush = brush;

        setFabricCanvas(canvas);
        toast.info("Paint over the areas you want to recolor", { duration: 4000 });

        return () => {
          canvas.dispose();
        };
      };
      img.src = imageUrl;
    }, [imageUrl]);

    // Update brush settings
    useEffect(() => {
      if (!fabricCanvas || !fabricCanvas.freeDrawingBrush) return;

      if (tool === "brush") {
        fabricCanvas.freeDrawingBrush.color = "rgba(255, 0, 0, 0.5)";
      } else {
        // Eraser - use destination-out compositing
        fabricCanvas.freeDrawingBrush.color = "rgba(0, 0, 0, 1)";
      }
      fabricCanvas.freeDrawingBrush.width = brushSize;
    }, [tool, brushSize, fabricCanvas]);

    // Handle eraser mode
    useEffect(() => {
      if (!fabricCanvas) return;

      fabricCanvas.on("path:created", (e: any) => {
        if (tool === "eraser" && e.path) {
          e.path.globalCompositeOperation = "destination-out";
          fabricCanvas.renderAll();
        }
      });
    }, [fabricCanvas, tool]);

    const handleClear = () => {
      if (!fabricCanvas) return;
      fabricCanvas.clear();
      fabricCanvas.backgroundColor = "transparent";
      fabricCanvas.renderAll();
      toast.info("Mask cleared");
    };

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      getMaskDataUrl: () => {
        if (!fabricCanvas) return null;

        // Create a temporary canvas for the binary mask
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = imageDimensions.width;
        tempCanvas.height = imageDimensions.height;
        const ctx = tempCanvas.getContext("2d");
        if (!ctx) return null;

        // Fill with black (areas to keep)
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Get the fabric canvas content
        const fabricElement = fabricCanvas.getElement();
        const fabricCtx = fabricElement.getContext("2d");
        if (!fabricCtx) return null;

        const imageData = fabricCtx.getImageData(
          0,
          0,
          tempCanvas.width,
          tempCanvas.height
        );

        // Convert painted areas to white (areas to inpaint)
        for (let i = 0; i < imageData.data.length; i += 4) {
          const alpha = imageData.data[i + 3];
          if (alpha > 50) {
            // Where there's paint, make it white
            ctx.fillStyle = "white";
            const x = (i / 4) % tempCanvas.width;
            const y = Math.floor(i / 4 / tempCanvas.width);
            ctx.fillRect(x, y, 1, 1);
          }
        }

        return tempCanvas.toDataURL("image/png");
      },
      hasMask: () => {
        if (!fabricCanvas) return false;
        return fabricCanvas.getObjects().length > 0;
      },
    }));

    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center gap-4">
        {/* Toolbar */}
        <div className="flex items-center gap-4 p-2 bg-card/80 backdrop-blur rounded-lg border border-border">
          <Button
            variant={tool === "brush" ? "default" : "outline"}
            size="sm"
            onClick={() => setTool("brush")}
            className="gap-2"
          >
            <Paintbrush className="w-4 h-4" />
            Brush
          </Button>
          <Button
            variant={tool === "eraser" ? "default" : "outline"}
            size="sm"
            onClick={() => setTool("eraser")}
            className="gap-2"
          >
            <Eraser className="w-4 h-4" />
            Eraser
          </Button>
          <div className="flex items-center gap-2 px-2">
            <span className="text-sm text-muted-foreground">Size:</span>
            <Slider
              value={[brushSize]}
              onValueChange={(v) => setBrushSize(v[0])}
              min={5}
              max={100}
              step={5}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground w-8">{brushSize}</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleClear} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Clear
          </Button>
        </div>

        {/* Canvas container with image background */}
        <div
          ref={containerRef}
          className="relative max-w-full overflow-hidden rounded-lg shadow-2xl"
          style={{ width: "100%", maxWidth: imageDimensions.width || 800 }}
        >
          {/* Background image */}
          <img
            src={imageUrl}
            alt="Furniture to recolor"
            className="block w-full h-auto"
            style={{
              width: imageDimensions.width || "auto",
              height: imageDimensions.height || "auto",
            }}
          />

          {/* Fabric canvas overlay */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0"
            style={{
              cursor: "crosshair",
              touchAction: "none",
            }}
          />
        </div>

        {/* Instructions */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            {selectedColor ? (
              <>Paint over the furniture parts you want to change to <strong>{selectedColor}</strong></>
            ) : (
              <>Select a color from the palette, then paint the areas to recolor</>
            )}
          </p>
        </div>
      </div>
    );
  }
);

MaskPainter.displayName = "MaskPainter";
