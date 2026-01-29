import { useState, useImperativeHandle, forwardRef, useEffect } from "react";
import { Loader2, RefreshCw, Layers, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PatternOption } from "@/components/PatternPalette";

export interface PartSelectorRef {
  getPatternAssignments: () => PartPatternAssignment[];
  hasSelection: () => boolean;
  clearSelection: () => void;
  assignPatternToPart: (partId: string, pattern: PatternOption) => void;
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

export interface PartPatternAssignment {
  part: FurniturePart;
  targetPattern: PatternOption;
}

interface PartSelectorProps {
  imageUrl: string;
  selectedPattern: PatternOption | null;
  onSelectionChange?: (hasSelection: boolean) => void;
}

export const PartSelector = forwardRef<PartSelectorRef, PartSelectorProps>(
  ({ imageUrl, selectedPattern, onSelectionChange }, ref) => {
    const [parts, setParts] = useState<FurniturePart[]>([]);
    const [patternAssignments, setPatternAssignments] = useState<Map<string, PatternOption>>(new Map());
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
      setPatternAssignments(new Map());
      setHasAnalyzed(false);
      setActivePartId(null);
      onSelectionChange?.(false);
    }, [imageUrl]);

    // When a pattern is selected and there's an active part, assign it
    useEffect(() => {
      if (selectedPattern && activePartId) {
        assignPattern(activePartId, selectedPattern);
        setActivePartId(null);
      }
    }, [selectedPattern]);

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
          toast.success(`Found ${data.parts.length} furniture parts. Click on a part, then select a pattern.`);
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

    const assignPattern = (partId: string, pattern: PatternOption) => {
      const newAssignments = new Map(patternAssignments);
      newAssignments.set(partId, pattern);
      setPatternAssignments(newAssignments);
      onSelectionChange?.(newAssignments.size > 0);
      
      const part = parts.find(p => p.id === partId);
      if (part) {
        toast.success(`Assigned ${pattern.name} to ${part.name}`);
      }
    };

    const removeAssignment = (partId: string) => {
      const newAssignments = new Map(patternAssignments);
      newAssignments.delete(partId);
      setPatternAssignments(newAssignments);
      onSelectionChange?.(newAssignments.size > 0);
    };

    const clearAllAssignments = () => {
      setPatternAssignments(new Map());
      setActivePartId(null);
      onSelectionChange?.(false);
    };

    const handlePartClick = (partId: string) => {
      if (selectedPattern) {
        // If a pattern is already selected, assign it directly
        assignPattern(partId, selectedPattern);
      } else {
        // Otherwise, mark this part as active (waiting for pattern selection)
        setActivePartId(partId === activePartId ? null : partId);
        if (partId !== activePartId) {
          toast.info("Now select a pattern from the palette");
        }
      }
    };

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      getPatternAssignments: () => {
        const assignments: PartPatternAssignment[] = [];
        patternAssignments.forEach((pattern, partId) => {
          const part = parts.find(p => p.id === partId);
          if (part) {
            assignments.push({ part, targetPattern: pattern });
          }
        });
        return assignments;
      },
      hasSelection: () => patternAssignments.size > 0,
      clearSelection: clearAllAssignments,
      assignPatternToPart: assignPattern,
    }));

    return (
      <div className="relative w-full h-full flex flex-col lg:flex-row gap-6">
        {/* Image display */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="relative max-w-full overflow-hidden rounded-lg shadow-2xl">
            <img
              src={imageUrl}
              alt="Furniture to customize"
              className="block max-w-full max-h-[500px] object-contain"
              draggable={false}
            />

            {/* Overlay for location markers - show assigned patterns */}
            {parts.map((part) => {
              const assignedPattern = patternAssignments.get(part.id);
              const isActive = activePartId === part.id;
              
              return part.location && (assignedPattern || isActive) && (
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
                  }}
                >
                  <span 
                    className="absolute -top-6 left-0 text-xs px-2 py-0.5 rounded whitespace-nowrap flex items-center gap-1 bg-primary text-primary-foreground"
                  >
                    {part.name}
                    {assignedPattern && ` → ${assignedPattern.name}`}
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
            Click a part, then select a pattern from the palette. You can assign different patterns to different parts.
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
              {patternAssignments.size > 0 && (
                <Button variant="outline" size="sm" onClick={clearAllAssignments}>
                  Clear All Assignments
                </Button>
              )}

              <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
                {parts.map((part) => {
                  const assignedPattern = patternAssignments.get(part.id);
                  const isActive = activePartId === part.id;
                  
                  return (
                    <div
                      key={part.id}
                      className={`relative flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        isActive
                          ? 'border-yellow-400 bg-yellow-400/10 ring-2 ring-yellow-400'
                          : assignedPattern
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/50'
                      }`}
                      onClick={() => handlePartClick(part.id)}
                    >
                      {/* Pattern indicator */}
                      <div 
                        className="w-10 h-10 rounded-md border border-border flex items-center justify-center shrink-0 overflow-hidden"
                      >
                        {assignedPattern ? (
                          <img 
                            src={assignedPattern.imageUrl} 
                            alt={assignedPattern.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Layers className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{part.name}</span>
                          {isActive && (
                            <span className="text-xs bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded">
                              Select pattern →
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {part.material} • {part.currentColor}
                        </div>
                        {assignedPattern && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs text-primary font-medium">
                              → {assignedPattern.name}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Remove button */}
                      {assignedPattern && (
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
              {patternAssignments.size > 0 && (
                <div className="p-3 bg-primary/10 rounded-lg text-sm space-y-2">
                  <strong>{patternAssignments.size} pattern change{patternAssignments.size > 1 ? 's' : ''} queued:</strong>
                  <div className="space-y-1">
                    {Array.from(patternAssignments.entries()).map(([partId, pattern]) => {
                      const part = parts.find(p => p.id === partId);
                      return part && (
                        <div key={partId} className="flex items-center gap-2 text-xs">
                          <span className="flex-1 truncate">{part.name}</span>
                          <span>→</span>
                          <span 
                            className="inline-block w-5 h-5 rounded-sm border border-border overflow-hidden" 
                          >
                            <img 
                              src={pattern.imageUrl} 
                              alt={pattern.name}
                              className="w-full h-full object-cover"
                            />
                          </span>
                          <span className="text-muted-foreground">{pattern.name}</span>
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

PartSelector.displayName = "PartSelector";
