import { useState } from "react";
import { Download, Loader2, ImageIcon, Sparkles, RotateCcw, Check, Image as ImageIconLucide, Plus } from "lucide-react";
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
import { BackgroundPlacer } from "@/components/BackgroundPlacer";

interface GeneratePanelProps {
  originalImage: string | null;
  generatedImage: string | null;
  isGenerating: boolean;
  onGenerate: () => void;
  canGenerate: boolean;
  assignmentCount: number;
  /** All customized furniture images collected so far */
  allFurnitureImages?: string[];
  /** Called when user wants to add another furniture */
  onAddMoreFurniture?: () => void;
  /** Remove one customized furniture by index */
  onRemoveFurniture?: (index: number) => void;
}

export function GeneratePanel({
  originalImage,
  generatedImage,
  isGenerating,
  onGenerate,
  canGenerate,
  assignmentCount,
  allFurnitureImages = [],
  onAddMoreFurniture,
  onRemoveFurniture,
}: GeneratePanelProps) {
  const [fileName, setFileName] = useState("customized-furniture");
  const [format, setFormat] = useState("png");
  const [showExport, setShowExport] = useState(false);
  const [showBackgroundPlacer, setShowBackgroundPlacer] = useState(false);

  const triggerDownload = (dataUrl: string, ext: string) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${fileName}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownload = async () => {
    if (!generatedImage) return;
    // The generated image is already on a transparent background (auto-removed
    // right after generation), so we can download it directly in any format.
    triggerDownload(generatedImage, format);
  };

  // Build the list of furniture images for background placement
  const furnitureForPlacement = allFurnitureImages.length > 0
    ? allFurnitureImages
    : generatedImage
    ? [generatedImage]
    : [];

  // If background placer is active, show it instead
  if (showBackgroundPlacer && furnitureForPlacement.length > 0) {
    return (
      <div className="h-full bg-card rounded-xl border border-border overflow-hidden">
        <BackgroundPlacer
          furnitureImages={furnitureForPlacement}
          onClose={() => setShowBackgroundPlacer(false)}
          onAddMoreFurniture={onAddMoreFurniture}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-lg">Preview & Generate</h2>
        <p className="text-sm text-muted-foreground">
          {generatedImage ? "Your customized design is ready!" : "Generate your customized furniture"}
        </p>
      </div>

      {/* Preview area */}
      <div className="flex-1 p-4 flex flex-col items-center justify-center min-h-[250px]">
        {isGenerating ? (
          <div className="flex flex-col items-center gap-4 animate-pulse">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" style={{ animationDuration: '1.5s' }} />
            </div>
            <div className="text-center">
              <p className="font-semibold text-lg">Creating your design...</p>
              <p className="text-sm text-muted-foreground mt-1">
                AI is applying patterns to your furniture
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                This usually takes 20-40 seconds
              </p>
            </div>
          </div>
        ) : generatedImage ? (
          <div className="w-full h-full flex flex-col items-center gap-4">
            <div
              className="relative flex-1 w-full flex items-center justify-center rounded-xl"
              style={{
                backgroundColor: "#ffffff",
                backgroundImage:
                  "linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)",
                backgroundSize: "20px 20px",
                backgroundPosition: "0 0, 0 10px, 10px -10px, 10px 0",
              }}
            >
              <img
                src={generatedImage}
                alt="Generated preview"
                className="max-w-full max-h-[300px] object-contain rounded-xl shadow-xl animate-scale-in"
              />
              <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                <Check className="w-3 h-3" />
                Complete
              </div>
            </div>
            {/* Show count of all collected furniture */}
            {allFurnitureImages.length > 1 && (
              <p className="text-xs text-muted-foreground">
                {allFurnitureImages.length} furniture pieces customized
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center py-8">
            <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center">
              <ImageIcon className="w-10 h-10 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">
                Preview Will Appear Here
              </h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-[250px]">
                {!originalImage 
                  ? "Upload an image to get started" 
                  : assignmentCount === 0
                  ? "Assign patterns to furniture parts"
                  : `${assignmentCount} pattern${assignmentCount > 1 ? 's' : ''} ready to apply`
                }
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Action area */}
      <div className="p-4 border-t border-border space-y-3">
        {/* Generate button */}
        <Button
          onClick={onGenerate}
          disabled={!canGenerate || isGenerating}
          className={cn(
            "w-full h-12 text-base font-semibold transition-all",
            canGenerate && !isGenerating && "bg-primary hover:bg-primary/90"
          )}
          variant={canGenerate ? "default" : "secondary"}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Generate Design
            </>
          )}
        </Button>

        {/* Status indicator */}
        {!generatedImage && !isGenerating && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <div className={cn(
              "w-2 h-2 rounded-full",
              canGenerate ? "bg-primary animate-pulse" : "bg-muted-foreground"
            )} />
            {canGenerate 
              ? "Ready to generate" 
              : !originalImage 
                ? "Upload an image first" 
                : "Assign at least one pattern"
            }
          </div>
        )}

        {/* Post-generation actions */}
        {generatedImage && (
          <>
            {/* Add Another Furniture */}
            {onAddMoreFurniture && (
              <Button
                variant="outline"
                className="w-full border-accent/30 hover:bg-accent/10"
                onClick={onAddMoreFurniture}
              >
                <Plus className="w-4 h-4 mr-2" />
                Customize Another Furniture
              </Button>
            )}

            {/* Place in Background button */}
            <Button
              variant="outline"
              className="w-full border-primary/30 text-primary hover:bg-primary/10"
              onClick={() => setShowBackgroundPlacer(true)}
            >
              <ImageIconLucide className="w-4 h-4 mr-2" />
              Place in Background
              {allFurnitureImages.length > 1 && (
                <span className="ml-1 text-xs">({allFurnitureImages.length} pieces)</span>
              )}
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowExport(!showExport)}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Image
            </Button>

            {showExport && (
              <div className="space-y-3 p-3 rounded-lg bg-secondary/50 animate-fade-in">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    File Name
                  </label>
                  <Input
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    className="h-9"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Format
                  </label>
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

                <p className="text-[11px] text-muted-foreground leading-snug">
                  Furniture is already isolated on a transparent background. PNG/WebP
                  preserve transparency; JPG will save with a white background.
                </p>

                <Button className="w-full" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  Download {format.toUpperCase()}
                </Button>
              </div>
            )}

            <Button
              variant="ghost"
              className="w-full"
              onClick={onGenerate}
              disabled={isGenerating}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Regenerate
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
