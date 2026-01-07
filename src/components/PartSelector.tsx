import { useState, useImperativeHandle, forwardRef, useEffect } from "react";
import { Loader2, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

export interface PartSelectorRef {
  getSelectedParts: () => FurniturePart[];
  hasSelection: () => boolean;
  clearSelection: () => void;
}

export interface FurniturePart {
  id: string;
  name: string;
  description?: string;
  material: string;
  currentColor: string;
  location?: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

interface PartSelectorProps {
  imageUrl: string;
  selectedColor: string | null;
  onSelectionChange?: (hasSelection: boolean) => void;
}

export const PartSelector = forwardRef<PartSelectorRef, PartSelectorProps>(
  ({ imageUrl, selectedColor, onSelectionChange }, ref) => {
    const [parts, setParts] = useState<FurniturePart[]>([]);
    const [selectedPartIds, setSelectedPartIds] = useState<Set<string>>(new Set());
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [hasAnalyzed, setHasAnalyzed] = useState(false);

    // Analyze image when it changes
    useEffect(() => {
      if (imageUrl && !hasAnalyzed) {
        analyzeImage();
      }
    }, [imageUrl]);

    // Reset on new image
    useEffect(() => {
      setParts([]);
      setSelectedPartIds(new Set());
      setHasAnalyzed(false);
      onSelectionChange?.(false);
    }, [imageUrl]);

    const analyzeImage = async () => {
      setIsAnalyzing(true);
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/segment-furniture`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ image: imageUrl }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to analyze image");
        }

        const data = await response.json();
        console.log("Furniture parts identified:", data.parts);
        
        if (data.parts && data.parts.length > 0) {
          setParts(data.parts);
          setHasAnalyzed(true);
          toast.success(`Found ${data.parts.length} furniture parts. Select which ones to recolor.`);
        } else {
          toast.error("No distinct parts found. Try a clearer image.");
        }
      } catch (error) {
        console.error("Analysis error:", error);
        toast.error(error instanceof Error ? error.message : "Failed to analyze image");
      } finally {
        setIsAnalyzing(false);
      }
    };

    const togglePartSelection = (partId: string) => {
      const newSelection = new Set(selectedPartIds);
      if (newSelection.has(partId)) {
        newSelection.delete(partId);
      } else {
        newSelection.add(partId);
      }
      setSelectedPartIds(newSelection);
      onSelectionChange?.(newSelection.size > 0);
    };

    const selectAll = () => {
      const allIds = new Set(parts.map(p => p.id));
      setSelectedPartIds(allIds);
      onSelectionChange?.(true);
    };

    const clearSelection = () => {
      setSelectedPartIds(new Set());
      onSelectionChange?.(false);
    };

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      getSelectedParts: () => parts.filter(p => selectedPartIds.has(p.id)),
      hasSelection: () => selectedPartIds.size > 0,
      clearSelection,
    }));

    return (
      <div className="relative w-full h-full flex flex-col lg:flex-row gap-6">
        {/* Image display */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="relative max-w-full overflow-hidden rounded-lg shadow-2xl">
            <img
              src={imageUrl}
              alt="Furniture to recolor"
              className="block max-w-full max-h-[500px] object-contain"
              draggable={false}
            />

            {/* Overlay for location markers */}
            {parts.map((part) => 
              part.location && selectedPartIds.has(part.id) && (
                <div
                  key={part.id}
                  className="absolute border-2 border-primary bg-primary/20 rounded pointer-events-none"
                  style={{
                    top: `${part.location.top}%`,
                    left: `${part.location.left}%`,
                    width: `${part.location.width}%`,
                    height: `${part.location.height}%`,
                  }}
                >
                  <span className="absolute -top-6 left-0 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded whitespace-nowrap">
                    {part.name}
                  </span>
                </div>
              )
            )}

            {/* Analyzing overlay */}
            {isAnalyzing && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <span className="text-sm font-medium">Analyzing furniture parts...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Parts selection panel */}
        <div className="lg:w-72 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Furniture Parts</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={analyzeImage}
              disabled={isAnalyzing}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
              Re-analyze
            </Button>
          </div>

          {isAnalyzing ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
            </div>
          ) : parts.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              Analyzing image...
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll} className="flex-1">
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={clearSelection} className="flex-1">
                  Clear
                </Button>
              </div>

              <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
                {parts.map((part) => (
                  <label
                    key={part.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedPartIds.has(part.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/50'
                    }`}
                  >
                    <Checkbox
                      checked={selectedPartIds.has(part.id)}
                      onCheckedChange={() => togglePartSelection(part.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{part.name}</span>
                        {selectedPartIds.has(part.id) && (
                          <Check className="w-3 h-3 text-primary" />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {part.material} • {part.currentColor}
                      </div>
                      {part.description && (
                        <div className="text-xs text-muted-foreground/70 mt-1 line-clamp-2">
                          {part.description}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              {selectedPartIds.size > 0 && selectedColor && (
                <div className="p-3 bg-primary/10 rounded-lg text-sm">
                  <strong>{selectedPartIds.size} part{selectedPartIds.size > 1 ? 's' : ''}</strong> will be recolored to{' '}
                  <span 
                    className="inline-block w-4 h-4 rounded-sm align-middle mx-1" 
                    style={{ backgroundColor: selectedColor }}
                  />
                  <strong>{selectedColor}</strong>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }
);

PartSelector.displayName = "PartSelector";