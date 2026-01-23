import { useState, useImperativeHandle, forwardRef, useEffect } from "react";
import { Loader2, Check, RefreshCw, Palette, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ColorOption } from "@/components/ColorPalette";

export interface PartSelectorRef {
  getColorAssignments: () => PartColorAssignment[];
  hasSelection: () => boolean;
  clearSelection: () => void;
  assignColorToPart: (partId: string, color: ColorOption) => void;
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

export interface PartColorAssignment {
  part: FurniturePart;
  targetColor: ColorOption;
}

interface PartSelectorProps {
  imageUrl: string;
  selectedColor: ColorOption | null;
  onSelectionChange?: (hasSelection: boolean) => void;
}

export const PartSelector = forwardRef<PartSelectorRef, PartSelectorProps>(
  ({ imageUrl, selectedColor, onSelectionChange }, ref) => {
    const [parts, setParts] = useState<FurniturePart[]>([]);
    const [colorAssignments, setColorAssignments] = useState<Map<string, ColorOption>>(new Map());
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [hasAnalyzed, setHasAnalyzed] = useState(false);
    const [activePartId, setActivePartId] = useState<string | null>(null);

    // Analyze image when it changes
    useEffect(() => {
      if (imageUrl && !hasAnalyzed) {
        analyzeImage();
      }
    }, [imageUrl]);

    // Reset on new image
    useEffect(() => {
      setParts([]);
      setColorAssignments(new Map());
      setHasAnalyzed(false);
      setActivePartId(null);
      onSelectionChange?.(false);
    }, [imageUrl]);

    // When a color is selected and there's an active part, assign it
    useEffect(() => {
      if (selectedColor && activePartId) {
        assignColor(activePartId, selectedColor);
        setActivePartId(null);
      }
    }, [selectedColor]);

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
          toast.success(`Found ${data.parts.length} furniture parts. Click on a part, then select a color.`);
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

    const assignColor = (partId: string, color: ColorOption) => {
      const newAssignments = new Map(colorAssignments);
      newAssignments.set(partId, color);
      setColorAssignments(newAssignments);
      onSelectionChange?.(newAssignments.size > 0);
      
      const part = parts.find(p => p.id === partId);
      if (part) {
        toast.success(`Assigned ${color.name} to ${part.name}`);
      }
    };

    const removeAssignment = (partId: string) => {
      const newAssignments = new Map(colorAssignments);
      newAssignments.delete(partId);
      setColorAssignments(newAssignments);
      onSelectionChange?.(newAssignments.size > 0);
    };

    const clearAllAssignments = () => {
      setColorAssignments(new Map());
      setActivePartId(null);
      onSelectionChange?.(false);
    };

    const handlePartClick = (partId: string) => {
      if (selectedColor) {
        // If a color is already selected, assign it directly
        assignColor(partId, selectedColor);
      } else {
        // Otherwise, mark this part as active (waiting for color selection)
        setActivePartId(partId === activePartId ? null : partId);
        if (partId !== activePartId) {
          toast.info("Now select a color from the palette");
        }
      }
    };

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      getColorAssignments: () => {
        const assignments: PartColorAssignment[] = [];
        colorAssignments.forEach((color, partId) => {
          const part = parts.find(p => p.id === partId);
          if (part) {
            assignments.push({ part, targetColor: color });
          }
        });
        return assignments;
      },
      hasSelection: () => colorAssignments.size > 0,
      clearSelection: clearAllAssignments,
      assignColorToPart: assignColor,
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

            {/* Overlay for location markers - show assigned colors */}
            {parts.map((part) => {
              const assignedColor = colorAssignments.get(part.id);
              const isActive = activePartId === part.id;
              
              return part.location && (assignedColor || isActive) && (
                <div
                  key={part.id}
                  className={`absolute border-2 rounded pointer-events-none transition-all ${
                    isActive 
                      ? 'border-yellow-400 bg-yellow-400/20 animate-pulse' 
                      : 'border-primary'
                  }`}
                  style={{
                    top: `${part.location.top}%`,
                    left: `${part.location.left}%`,
                    width: `${part.location.width}%`,
                    height: `${part.location.height}%`,
                    backgroundColor: assignedColor ? `${assignedColor.hex}33` : undefined,
                  }}
                >
                  <span 
                    className="absolute -top-6 left-0 text-xs px-2 py-0.5 rounded whitespace-nowrap flex items-center gap-1"
                    style={{ 
                      backgroundColor: assignedColor?.hex || 'hsl(var(--primary))',
                      color: assignedColor ? (isLightColor(assignedColor.hex) ? '#000' : '#fff') : 'hsl(var(--primary-foreground))'
                    }}
                  >
                    {part.name}
                    {assignedColor && ` → ${assignedColor.name}`}
                  </span>
                </div>
              );
            })}

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
        <div className="lg:w-80 flex flex-col gap-4">
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

          <p className="text-xs text-muted-foreground">
            Click a part, then select a color from the palette. You can assign different colors to different parts.
          </p>

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
              {colorAssignments.size > 0 && (
                <Button variant="outline" size="sm" onClick={clearAllAssignments}>
                  Clear All Assignments
                </Button>
              )}

              <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
                {parts.map((part) => {
                  const assignedColor = colorAssignments.get(part.id);
                  const isActive = activePartId === part.id;
                  
                  return (
                    <div
                      key={part.id}
                      className={`relative flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        isActive
                          ? 'border-yellow-400 bg-yellow-400/10 ring-2 ring-yellow-400'
                          : assignedColor
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/50'
                      }`}
                      onClick={() => handlePartClick(part.id)}
                    >
                      {/* Color indicator */}
                      <div 
                        className="w-8 h-8 rounded-md border border-border flex items-center justify-center shrink-0"
                        style={{ backgroundColor: assignedColor?.hex || 'transparent' }}
                      >
                        {!assignedColor && <Palette className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{part.name}</span>
                          {isActive && (
                            <span className="text-xs bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded">
                              Select color →
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {part.material} • {part.currentColor}
                        </div>
                        {assignedColor && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs text-primary font-medium">
                              → {assignedColor.name}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Remove button */}
                      {assignedColor && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeAssignment(part.id);
                          }}
                          className="absolute top-2 right-2 p-1 rounded-full hover:bg-destructive/20 transition-colors"
                        >
                          <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Summary of assignments */}
              {colorAssignments.size > 0 && (
                <div className="p-3 bg-primary/10 rounded-lg text-sm space-y-2">
                  <strong>{colorAssignments.size} color change{colorAssignments.size > 1 ? 's' : ''} queued:</strong>
                  <div className="space-y-1">
                    {Array.from(colorAssignments.entries()).map(([partId, color]) => {
                      const part = parts.find(p => p.id === partId);
                      return part && (
                        <div key={partId} className="flex items-center gap-2 text-xs">
                          <span className="flex-1 truncate">{part.name}</span>
                          <span>→</span>
                          <span 
                            className="inline-block w-4 h-4 rounded-sm border border-border" 
                            style={{ backgroundColor: color.hex }}
                          />
                          <span className="text-muted-foreground">{color.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }
);

// Helper function to determine if a color is light
function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

PartSelector.displayName = "PartSelector";
