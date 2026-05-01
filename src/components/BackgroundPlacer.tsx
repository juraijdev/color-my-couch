import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Upload, Loader2, Sparkles, RotateCcw, X, Download, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { compressImage, resizeTransparentPng } from "@/lib/imageUtils";

interface BackgroundPlacerProps {
  /** Array of customized furniture images (base64 data URLs) */
  furnitureImages: string[];
  onClose: () => void;
  /** Called when user wants to add another furniture before placing */
  onAddMoreFurniture?: () => void;
  /** Remove a single furniture piece by index */
  onRemoveFurniture?: (index: number) => void;
}

export function BackgroundPlacer({
  furnitureImages,
  onClose,
  onAddMoreFurniture,
  onRemoveFurniture,
}: BackgroundPlacerProps) {
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [compositedImage, setCompositedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [fileName, setFileName] = useState("furniture-in-room");
  const [format, setFormat] = useState("png");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setBackgroundImage(e.target?.result as string);
      setCompositedImage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleGenerate = async () => {
    if (!backgroundImage) {
      toast.error("Please upload a background image first");
      return;
    }

    if (furnitureImages.length === 0) {
      toast.error("No furniture images to place");
      return;
    }

    setIsProcessing(true);
    toast.info(
      furnitureImages.length > 1
        ? `AI is placing ${furnitureImages.length} furniture pieces in the scene...`
        : "AI is placing your furniture in the scene..."
    );

    try {
      // Compress all images to reduce payload
      const compressedBackground = await compressImage(backgroundImage, 1600, 0.9);
      const compressedFurniture = await Promise.all(
        furnitureImages.map((img) => resizeTransparentPng(img, 1800))
      );

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/place-in-background`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            furnitureImages: compressedFurniture,
            backgroundImage: compressedBackground,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate");
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.output) {
        setCompositedImage(result.output);
        toast.success("Furniture placed in background successfully!");
      } else {
        throw new Error("No output image received");
      }
    } catch (error) {
      console.error("Background placement error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to place furniture. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!compositedImage) return;
    const link = document.createElement("a");
    link.href = compositedImage;
    link.download = `${fileName}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearBackground = () => {
    setBackgroundImage(null);
    setCompositedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h2 className="font-semibold text-lg">Place in Background</h2>
          <p className="text-sm text-muted-foreground">
            {furnitureImages.length > 1
              ? `${furnitureImages.length} furniture pieces ready to place`
              : "Upload a room or scene to place your furniture in"}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Furniture thumbnails */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Your Furniture ({furnitureImages.length})
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {furnitureImages.map((img, idx) => (
              <div
                key={idx}
                className="relative w-20 h-20 shrink-0 rounded-lg border border-border overflow-hidden bg-muted/50 group"
              >
                <img
                  src={img}
                  alt={`Furniture ${idx + 1}`}
                  className="w-full h-full object-contain"
                />
                {onRemoveFurniture && furnitureImages.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFurniture(idx);
                      setCompositedImage(null);
                      toast.success("Furniture removed");
                    }}
                    title="Remove this furniture"
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-background/90 hover:bg-destructive hover:text-destructive-foreground shadow-sm transition-all opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            {/* Add more furniture button */}
            {onAddMoreFurniture && (
              <button
                onClick={onAddMoreFurniture}
                className="w-20 h-20 shrink-0 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 transition-colors"
              >
                <Plus className="w-5 h-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Add More</span>
              </button>
            )}
          </div>
        </div>

        {/* Background upload */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Background Scene
          </label>
          {backgroundImage ? (
            <div className="relative aspect-video rounded-xl border border-border overflow-hidden bg-muted/50 group">
              <img
                src={backgroundImage}
                alt="Background scene"
                className="w-full h-full object-cover"
              />
              <button
                onClick={clearBackground}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 hover:bg-destructive/20 transition-colors opacity-0 group-hover:opacity-100"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ) : (
            <div
              className={cn(
                "aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all gap-2",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 bg-muted/30"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 text-muted-foreground" />
              <p className="text-xs text-muted-foreground text-center px-2">
                Drop or click to upload background
              </p>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Result preview */}
        {(isProcessing || compositedImage) && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Result
            </label>
            <div className="rounded-xl border border-border overflow-hidden bg-muted/30 min-h-[200px] flex items-center justify-center">
              {isProcessing ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                    <div
                      className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin"
                      style={{ animationDuration: "1.5s" }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold">Compositing scene...</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      AI is placing your furniture naturally
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      This may take 20-40 seconds
                    </p>
                  </div>
                </div>
              ) : compositedImage ? (
                <img
                  src={compositedImage}
                  alt="Furniture in background"
                  className="w-full object-contain max-h-[300px] animate-scale-in"
                />
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-border space-y-3">
        {!compositedImage ? (
          <Button
            onClick={handleGenerate}
            disabled={!backgroundImage || isProcessing}
            className={cn(
              "w-full h-11 font-semibold transition-all",
              backgroundImage &&
                !isProcessing &&
                "bg-primary hover:bg-primary/90 shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
            )}
            variant={backgroundImage ? "default" : "secondary"}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Placing...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Place {furnitureImages.length > 1 ? `${furnitureImages.length} Pieces` : ""} in Background
              </>
            )}
          </Button>
        ) : (
          <>
            <Button variant="outline" className="w-full" onClick={() => setShowExport(!showExport)}>
              <Download className="w-4 h-4 mr-2" />
              Download Image
            </Button>

            {showExport && (
              <div className="space-y-3 p-3 rounded-lg bg-secondary/50 animate-fade-in">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">File Name</label>
                  <Input value={fileName} onChange={(e) => setFileName(e.target.value)} className="h-9" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Format</label>
                  <Select value={format} onValueChange={setFormat}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="png">PNG (Best Quality)</SelectItem>
                      <SelectItem value="jpg">JPG (Smaller Size)</SelectItem>
                      <SelectItem value="webp">WebP (Web Optimized)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  Download {format.toUpperCase()}
                </Button>
              </div>
            )}

            <Button
              variant="ghost"
              className="w-full"
              onClick={handleGenerate}
              disabled={isProcessing}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Regenerate
            </Button>
          </>
        )}

        {!backgroundImage && !isProcessing && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-muted-foreground" />
            Upload a background image to get started
          </div>
        )}
      </div>
    </div>
  );
}
